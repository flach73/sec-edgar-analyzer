"""
SEC EDGAR 10-K Filing Ingestion Script
Extracts financial metrics and risk keywords from SEC filings
"""

import os
import re
import time
from datetime import datetime
from typing import Optional, Tuple
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

# Load environment variables
load_dotenv()
load_dotenv('.env.local')

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


def get_company_filings(cik: str, filing_type: str = "10-K", count: int = 3) -> list:
    """Fetch recent filings for a company from SEC EDGAR."""
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
    
    if primary_doc:
        return f"https://www.sec.gov/Archives/edgar/data/{cik_padded}/{accession}/{primary_doc}"
    
    index_url = f"https://www.sec.gov/Archives/edgar/data/{cik_padded}/{accession}/index.json"
    
    try:
        response = requests.get(index_url, headers=HEADERS)
        response.raise_for_status()
        data = response.json()
        
        for item in data.get("directory", {}).get("item", []):
            name = item.get("name", "")
            if name.endswith(".htm") and "10-k" in name.lower():
                return f"https://www.sec.gov/Archives/edgar/data/{cik_padded}/{accession}/{name}"
        
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
        
        for element in soup(["script", "style"]):
            element.decompose()
        
        text = soup.get_text(separator=" ", strip=True)
        return text
    
    except Exception as e:
        print(f"Error fetching filing content: {e}")
        return None


def detect_unit_scale(text: str) -> int:
    """
    Detect the unit scale from the document.
    SEC filings typically state 'in millions' or 'in thousands' near the top.
    Returns multiplier: 1, 1000, or 1000000
    """
    # Look in the first 5000 characters for unit declarations
    header_text = text[:5000].lower()
    
    # Common patterns in SEC filings
    if re.search(r'in\s+millions|amounts?\s+in\s+millions|\(in\s+millions\)|\$\s*in\s+millions', header_text):
        return 1_000_000
    elif re.search(r'in\s+thousands|amounts?\s+in\s+thousands|\(in\s+thousands\)', header_text):
        return 1_000
    elif re.search(r'in\s+billions|amounts?\s+in\s+billions', header_text):
        return 1_000_000_000
    
    # Also check for table headers that indicate scale
    if re.search(r'\(\s*\$\s*in\s+millions\s*\)', header_text):
        return 1_000_000
    
    # Default to millions (most common for large companies)
    return 1_000_000


def clean_number(text: str) -> Optional[float]:
    """Clean and parse a number from text."""
    # Remove currency symbols, commas, spaces
    cleaned = re.sub(r'[$,\s]', '', text)
    # Handle parentheses for negative numbers
    if cleaned.startswith('(') and cleaned.endswith(')'):
        cleaned = '-' + cleaned[1:-1]
    try:
        return float(cleaned)
    except ValueError:
        return None


def extract_metrics(text: str) -> dict:
    """Extract financial metrics from filing text using improved patterns."""
    metrics = {}
    text_lower = text.lower()
    
    # Detect the unit scale for this filing
    unit_scale = detect_unit_scale(text)
    
    # Define extraction patterns with context
    # Each pattern is (metric_name, regex_pattern, is_required_to_be_positive)
    extraction_rules = [
        # Revenue patterns - look for consolidated/total revenue
        ("revenue", [
            # Pattern 1: "Total net revenues" or "Total revenues" followed by a number
            r'total\s+(?:net\s+)?revenues?\s*[\$\s]*([0-9,]+(?:\.[0-9]+)?)',
            # Pattern 2: "Net revenues" at start of line/section
            r'(?:^|\n)\s*net\s+revenues?\s*[\$\s]*([0-9,]+(?:\.[0-9]+)?)',
            # Pattern 3: "Total net sales" (retail companies)
            r'total\s+(?:net\s+)?sales\s*[\$\s]*([0-9,]+(?:\.[0-9]+)?)',
            # Pattern 4: "Net sales" 
            r'(?:^|\n)\s*net\s+sales\s*[\$\s]*([0-9,]+(?:\.[0-9]+)?)',
            # Pattern 5: Revenue table row
            r'revenue[s]?\s+[\$\s]*([0-9,]+(?:\.[0-9]+)?)\s+[\$\s]*[0-9,]+',
        ], True),
        
        # Net income patterns
        ("net_income", [
            # Pattern 1: "Net income" followed by a number
            r'net\s+income\s*[\$\s]*\(?\s*([0-9,]+(?:\.[0-9]+)?)\s*\)?',
            # Pattern 2: "Net earnings"
            r'net\s+earnings\s*[\$\s]*\(?\s*([0-9,]+(?:\.[0-9]+)?)\s*\)?',
            # Pattern 3: Table format with label
            r'net\s+income\s+attributable\s+to[^0-9]*[\$\s]*\(?\s*([0-9,]+(?:\.[0-9]+)?)\s*\)?',
        ], False),
        
        # Total assets
        ("total_assets", [
            r'total\s+assets\s*[\$\s]*([0-9,]+(?:\.[0-9]+)?)',
        ], True),
        
        # Total liabilities
        ("total_liabilities", [
            r'total\s+liabilities\s*[\$\s]*([0-9,]+(?:\.[0-9]+)?)',
        ], True),
        
        # Cash and equivalents
        ("cash_and_equivalents", [
            r'cash\s+and\s+cash\s+equivalents\s*[\$\s]*([0-9,]+(?:\.[0-9]+)?)',
            r'cash,?\s+cash\s+equivalents[^0-9]*[\$\s]*([0-9,]+(?:\.[0-9]+)?)',
        ], True),
    ]
    
    for metric_name, patterns, must_be_positive in extraction_rules:
        candidates = []
        
        for pattern in patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                value = clean_number(match)
                if value is not None and value > 0:
                    candidates.append(value)
        
        if candidates:
            # For revenue and assets, take the LARGEST value (total, not segment)
            # For other metrics, take the most common or first reasonable value
            if metric_name in ['revenue', 'total_assets', 'total_liabilities']:
                # Take the largest value (likely the total/consolidated amount)
                raw_value = max(candidates)
            else:
                # Take the first reasonable value
                raw_value = candidates[0]
            
            # Apply unit scale
            final_value = raw_value * unit_scale
            
            # Sanity checks based on metric type
            if metric_name == 'revenue':
                # Revenue should typically be > $1M for public companies
                if final_value < 1_000_000:
                    # Maybe scale was wrong, try without it
                    if raw_value > 1_000:
                        final_value = raw_value * 1_000_000
            
            metrics[metric_name] = final_value
    
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
    
    keywords_found.sort(key=lambda x: x["frequency"], reverse=True)
    return keywords_found[:10]


def get_fiscal_year_from_date(filing_date: str) -> int:
    """Extract fiscal year from filing date."""
    date = datetime.strptime(filing_date, "%Y-%m-%d")
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
    
    filings = get_company_filings(company["cik"], "10-K", 3)
    print(f"Found {len(filings)} 10-K filings")
    
    for filing_info in filings:
        print(f"\n  Processing {filing_info['filing_date']}...")
        time.sleep(0.5)
        
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
        
        content = fetch_filing_content(doc_url)
        
        if not content:
            print(f"    Failed to fetch content")
            results["filings_failed"] += 1
            continue
        
        print(f"    Content length: {len(content):,} characters")
        
        # Detect unit scale
        unit_scale = detect_unit_scale(content)
        scale_name = {1: "units", 1000: "thousands", 1_000_000: "millions", 1_000_000_000: "billions"}.get(unit_scale, "unknown")
        print(f"    Detected scale: {scale_name}")
        
        metrics = extract_metrics(content)
        keywords = extract_risk_keywords(content)
        
        print(f"    Extracted {len(metrics)} metrics, {len(keywords)} risk keywords")
        for name, value in metrics.items():
            print(f"      - {name}: ${value:,.0f}")
        
        fiscal_year = get_fiscal_year_from_date(filing_info["filing_date"])
        
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
            
            for metric_name, metric_value in metrics.items():
                supabase.table("financial_metrics").insert({
                    "filing_id": filing_id,
                    "metric_name": metric_name,
                    "metric_value": metric_value,
                    "unit": "USD",
                }).execute()
            
            for kw in keywords:
                supabase.table("risk_keywords").insert({
                    "filing_id": filing_id,
                    "keyword": kw["keyword"],
                    "frequency": kw["frequency"],
                    "section": "Item 1A",
                }).execute()
            
            results["filings_processed"] += 1
            print(f"    [OK] Saved to database")
            
        except Exception as e:
            error_msg = str(e)
            if hasattr(e, 'message'):
                error_msg = e.message
            print(f"    Error saving to database: {error_msg}")
            results["filings_failed"] += 1
        
        time.sleep(0.5)
    
    return results


def main():
    """Main ingestion function."""
    print("SEC EDGAR Analyzer - Data Ingestion")
    print(f"Started at: {datetime.now().isoformat()}")
    
    companies = supabase.table("companies").select("*").execute()
    
    print(f"\nFound {len(companies.data)} companies to process")
    
    total_processed = 0
    total_failed = 0
    
    for company in companies.data:
        result = process_company(company)
        total_processed += result["filings_processed"]
        total_failed += result["filings_failed"]
        time.sleep(1)
    
    print(f"\n{'='*50}")
    print(f"Completed at: {datetime.now().isoformat()}")
    print(f"{'='*50}")
    print(f"Total filings processed: {total_processed}")
    print(f"Total filings failed: {total_failed}")


if __name__ == "__main__":
    main()
