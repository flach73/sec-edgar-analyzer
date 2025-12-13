"""
SEC EDGAR 10-K Filing Ingestion Script
Extracts financial metrics and risk keywords from SEC filings
"""

import os
import re
import time
import json
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

# Load environment variables
load_dotenv()
load_dotenv('.env.local')  # Also try .env.local

# Configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# SEC EDGAR API headers (required by SEC)
HEADERS = {
    "User-Agent": "SEC-EDGAR-Analyzer contact@example.com",
    "Accept-Encoding": "gzip, deflate",
}

# Risk keywords to track
RISK_KEYWORDS = [
    "supply chain", "inflation", "cybersecurity", "cyber security", "litigation",
    "regulation", "regulatory", "competition", "competitive", "climate",
    "pandemic", "geopolitical", "interest rate", "currency", "foreign exchange",
    "tariff", "trade war", "recession", "labor", "workforce"
]

# Financial metric patterns (regex)
METRIC_PATTERNS = {
    "revenue": [
        r"(?:total\s+)?(?:net\s+)?revenues?\s*[\$\s]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion)?",
        r"net\s+sales\s*[\$\s]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion)?",
    ],
    "net_income": [
        r"net\s+income\s*[\$\s]*\(?\s*([0-9,]+(?:\.[0-9]+)?)\s*\)?\s*(?:million|billion)?",
        r"net\s+earnings\s*[\$\s]*\(?\s*([0-9,]+(?:\.[0-9]+)?)\s*\)?\s*(?:million|billion)?",
    ],
    "total_assets": [
        r"total\s+assets\s*[\$\s]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion)?",
    ],
    "total_liabilities": [
        r"total\s+liabilities\s*[\$\s]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion)?",
    ],
    "cash_and_equivalents": [
        r"cash\s+and\s+cash\s+equivalents\s*[\$\s]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion)?",
    ],
}


def get_company_filings(cik: str, filing_type: str = "10-K", count: int = 3) -> list:
    """Fetch recent filings for a company from SEC EDGAR."""
    # Pad CIK to 10 digits
    cik_padded = cik.zfill(10)
    
    url = f"https://data.sec.gov/submissions/CIK{cik_padded}.json"
    
    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        data = response.json()
        
        filings = []
        recent = data.get("filings", {}).get("recent", {})
        
        forms = recent.get("form", [])
        dates = recent.get("filingDate", [])
        accessions = recent.get("accessionNumber", [])
        primary_docs = recent.get("primaryDocument", [])
        
        for i, form in enumerate(forms):
            if form == filing_type and len(filings) < count:
                filings.append({
                    "filing_date": dates[i],
                    "accession_number": accessions[i].replace("-", ""),
                    "accession_formatted": accessions[i],
                    "primary_document": primary_docs[i] if i < len(primary_docs) else None,
                })
        
        return filings
    
    except Exception as e:
        print(f"Error fetching filings for CIK {cik}: {e}")
        return []


def get_filing_document_url(cik: str, accession: str, primary_doc: Optional[str] = None) -> Optional[str]:
    """Get the URL for the main 10-K document."""
    cik_padded = cik.zfill(10)
    
    # If we have the primary document name, use it
    if primary_doc:
        url = f"https://www.sec.gov/Archives/edgar/data/{cik_padded}/{accession}/{primary_doc}"
        return url
    
    # Otherwise, fetch the filing index and find the 10-K document
    index_url = f"https://www.sec.gov/Archives/edgar/data/{cik_padded}/{accession}/index.json"
    
    try:
        response = requests.get(index_url, headers=HEADERS)
        response.raise_for_status()
        data = response.json()
        
        # Look for the main 10-K document
        for item in data.get("directory", {}).get("item", []):
            name = item.get("name", "")
            if name.endswith(".htm") and "10-k" in name.lower():
                return f"https://www.sec.gov/Archives/edgar/data/{cik_padded}/{accession}/{name}"
        
        # Fallback: look for any .htm file that's not an exhibit
        for item in data.get("directory", {}).get("item", []):
            name = item.get("name", "")
            if name.endswith(".htm") and "ex" not in name.lower():
                return f"https://www.sec.gov/Archives/edgar/data/{cik_padded}/{accession}/{name}"
                
    except Exception as e:
        print(f"Error fetching filing index: {e}")
    
    return None


def fetch_filing_content(url: str) -> Optional[str]:
    """Fetch and parse the content of a filing."""
    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, "html.parser")
        
        # Remove script and style elements
        for element in soup(["script", "style"]):
            element.decompose()
        
        # Get text content
        text = soup.get_text(separator=" ", strip=True)
        
        return text
    
    except Exception as e:
        print(f"Error fetching filing content: {e}")
        return None


def extract_metrics(text: str) -> dict:
    """Extract financial metrics from filing text."""
    metrics = {}
    text_lower = text.lower()
    
    for metric_name, patterns in METRIC_PATTERNS.items():
        for pattern in patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            if matches:
                # Take the first significant match
                for match in matches:
                    try:
                        # Clean the number
                        value_str = match.replace(",", "").strip()
                        value = float(value_str)
                        
                        # Skip very small values (likely percentages)
                        if value > 100:
                            # Check if billion/million context
                            context_start = max(0, text_lower.find(match) - 50)
                            context = text_lower[context_start:context_start + 100]
                            
                            if "billion" in context:
                                value *= 1_000_000_000
                            elif "million" in context:
                                value *= 1_000_000
                            
                            metrics[metric_name] = value
                            break
                    except ValueError:
                        continue
                break
    
    return metrics


def extract_risk_keywords(text: str) -> list:
    """Extract risk keyword frequencies from filing text."""
    text_lower = text.lower()
    keywords_found = []
    
    for keyword in RISK_KEYWORDS:
        count = text_lower.count(keyword.lower())
        if count > 0:
            keywords_found.append({
                "keyword": keyword,
                "frequency": count,
            })
    
    # Sort by frequency
    keywords_found.sort(key=lambda x: x["frequency"], reverse=True)
    
    return keywords_found[:10]  # Top 10


def get_fiscal_year_from_date(filing_date: str) -> int:
    """Extract fiscal year from filing date."""
    date = datetime.strptime(filing_date, "%Y-%m-%d")
    # 10-Ks are usually filed within 60-90 days after fiscal year end
    # So a filing in Feb 2024 is for FY 2023
    if date.month <= 3:
        return date.year - 1
    return date.year


def process_company(company: dict) -> dict:
    """Process all filings for a company."""
    results = {
        "company_id": company["id"],
        "ticker": company["ticker"],
        "filings_processed": 0,
        "filings_failed": 0,
    }
    
    print(f"\n{'='*50}")
    print(f"Processing {company['ticker']} (CIK: {company['cik']})")
    print(f"{'='*50}")
    
    # Get recent filings
    filings = get_company_filings(company["cik"], "10-K", 3)
    print(f"Found {len(filings)} 10-K filings")
    
    for filing_info in filings:
        print(f"\n  Processing {filing_info['filing_date']}...")
        time.sleep(0.5)  # Rate limiting
        
        # Get document URL
        doc_url = get_filing_document_url(
            company["cik"],
            filing_info["accession_number"],
            filing_info.get("primary_document")
        )
        
        if not doc_url:
            print(f"    Could not find document URL")
            results["filings_failed"] += 1
            continue
        
        print(f"    Fetching: {doc_url}")
        
        # Fetch content
        content = fetch_filing_content(doc_url)
        
        if not content:
            print(f"    Failed to fetch content")
            results["filings_failed"] += 1
            continue
        
        print(f"    Content length: {len(content):,} characters")
        
        # Extract data
        metrics = extract_metrics(content)
        keywords = extract_risk_keywords(content)
        
        print(f"    Extracted {len(metrics)} metrics, {len(keywords)} risk keywords")
        
        # Determine fiscal year
        fiscal_year = get_fiscal_year_from_date(filing_info["filing_date"])
        
        # Insert filing record
        try:
            filing_data = {
                "company_id": company["id"],
                "filing_type": "10-K",
                "filing_date": filing_info["filing_date"],
                "fiscal_year": fiscal_year,
                "fiscal_period": "FY",
                "accession_number": filing_info["accession_formatted"],
                "source_url": doc_url,
            }
            
            filing_result = supabase.table("filings").insert(filing_data).execute()
            filing_id = filing_result.data[0]["id"]
            
            # Insert metrics
            for metric_name, metric_value in metrics.items():
                supabase.table("financial_metrics").insert({
                    "filing_id": filing_id,
                    "metric_name": metric_name,
                    "metric_value": metric_value,
                    "unit": "USD",
                }).execute()
            
            # Insert keywords
            for kw in keywords:
                supabase.table("risk_keywords").insert({
                    "filing_id": filing_id,
                    "keyword": kw["keyword"],
                    "frequency": kw["frequency"],
                    "section": "Item 1A",
                }).execute()
            
            results["filings_processed"] += 1
            print(f"    ✓ Saved to database")
            
        except Exception as e:
            print(f"    Error saving to database: {e}")
            results["filings_failed"] += 1
        
        time.sleep(0.5)  # Rate limiting
    
    return results


def main():
    """Main ingestion function."""
    print("SEC EDGAR Analyzer - Data Ingestion")
    print(f"Started at: {datetime.now().isoformat()}")
    
    # Get all companies from database
    companies = supabase.table("companies").select("*").execute()
    
    print(f"\nFound {len(companies.data)} companies to process")
    
    total_processed = 0
    total_failed = 0
    
    for company in companies.data:
        result = process_company(company)
        total_processed += result["filings_processed"]
        total_failed += result["filings_failed"]
        time.sleep(1)  # Rate limiting between companies
    
    print(f"\n{'='*50}")
    print(f"Completed at: {datetime.now().isoformat()}")
    print(f"{'='*50}")
    print(f"Total filings processed: {total_processed}")
    print(f"Total filings failed: {total_failed}")


if __name__ == "__main__":
    main()
