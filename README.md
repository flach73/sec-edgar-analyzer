# SEC EDGAR Analyzer

A full-stack data engineering application that extracts financial metrics and risk keywords from SEC 10-K filings. Built to demonstrate ETL pipeline development, messy data parsing, and modern web development.

🔗 **Live Demo:** [sec-edgar-analyzer.vercel.app](https://sec-edgar-analyzer.vercel.app/)

![SEC EDGAR Analyzer Dashboard](https://img.shields.io/badge/status-live-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![Python](https://img.shields.io/badge/Python-3.11-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

---

## Overview

SEC EDGAR Analyzer pulls real financial data from the SEC's EDGAR database, processes unstructured 10-K filings, and presents key metrics in an interactive dashboard. The project showcases:

- **ETL Pipeline**: Python scripts that fetch, parse, and normalize SEC filing data
- **Data Engineering**: Handling messy HTML documents with inconsistent formatting
- **Full-Stack Development**: Next.js frontend with Supabase backend
- **Interactive Analytics**: Search, compare companies, and export data

---

## Features

### 📊 Company Dashboard
- Grid view of tracked companies with key financial metrics
- **Sparkline charts** on each card showing revenue and income trends at a glance
- Year-over-year growth indicators (↑12% / ↓5%)
- Sector badges and risk factor previews

### 🔍 Search & Filter
- Real-time search by ticker, company name, or sector
- Instant filtering as you type
- Clear search with one click

### ⚖️ Side-by-Side Comparison
- Select 2+ companies to compare
- Color-coded metrics table
- Overlaid trend charts (Revenue, Net Income, Assets, Profit Margin)
- Visual comparison across fiscal years

### 📈 Financial Charts
- Revenue & Net Income bar charts
- Total Assets line chart
- Profit Margin trends over time
- Interactive tooltips with formatted values

### 📥 Export to CSV
- Export comparison data for selected companies
- Export individual company filing history
- Clean CSV format ready for Excel/Google Sheets

### 🎯 Risk Factor Analysis
- Automated keyword extraction from Item 1A
- Frequency tracking across filings
- Visual risk factor badges

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   SEC EDGAR     │────▶│  Python ETL      │────▶│    Supabase     │
│   API           │     │  Pipeline        │     │    PostgreSQL   │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │     Vercel       │◀────│   Next.js App   │
                        │     (Deploy)     │     │   (Frontend)    │
                        └──────────────────┘     └─────────────────┘
```

### Data Flow

1. **Fetch**: Python script queries SEC EDGAR API for 10-K filings
2. **Parse**: BeautifulSoup extracts text from HTML documents
3. **Extract**: Regex patterns identify financial metrics and risk keywords
4. **Store**: Normalized data saved to Supabase PostgreSQL
5. **Display**: Next.js frontend renders interactive charts and tables

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Charts | Recharts (with sparklines) |
| Database | Supabase (PostgreSQL) |
| ETL | Python, BeautifulSoup, Requests |
| Deployment | Vercel |
| Data Source | SEC EDGAR API |

---

## Screenshots

### Dashboard with Sparklines
Company cards display mini trend charts showing historical performance at a glance.

### Company Comparison
Select multiple companies to view side-by-side metrics and overlaid trend charts.

### Search & Filter
Quickly find companies by ticker, name, or sector with real-time filtering.

---

## Database Schema

```sql
companies
├── id (uuid)
├── ticker (varchar)
├── name (varchar)
├── cik (varchar)
└── sector (varchar)

filings
├── id (uuid)
├── company_id (fk)
├── filing_type (varchar)
├── filing_date (date)
├── fiscal_year (int)
└── source_url (text)

financial_metrics
├── id (uuid)
├── filing_id (fk)
├── metric_name (varchar)
├── metric_value (numeric)
└── unit (varchar)

risk_keywords
├── id (uuid)
├── filing_id (fk)
├── keyword (varchar)
├── frequency (int)
└── section (varchar)
```

---

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.9+
- Supabase account

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/flach73/sec-edgar-analyzer.git
   cd sec-edgar-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Run database migrations**
   ```bash
   # Execute sql/schema.sql in Supabase SQL Editor
   ```

5. **Ingest SEC data**
   ```bash
   python scripts/ingest_filings.py
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

---

## ETL Pipeline Details

The Python ingestion script (`scripts/ingest_filings.py`) handles:

- **Unit Detection**: Automatically detects "in millions" / "in thousands" from document headers
- **Smart Extraction**: Takes largest match for revenue/assets to get totals, not segments
- **Rate Limiting**: Respects SEC's 10 requests/second limit
- **Error Handling**: Graceful failures with retry logic
- **Data Normalization**: Converts varied formats to consistent schema

### Tracked Metrics
- Total Revenue / Net Sales
- Net Income / Earnings
- Total Assets
- Total Liabilities
- Cash and Cash Equivalents

### Risk Keywords
Supply chain, inflation, cybersecurity, litigation, regulation, competition, climate, pandemic, geopolitical, interest rate

---

## Project Structure

```
sec-edgar-analyzer/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main dashboard page
│   │   ├── layout.tsx            # App layout
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   ├── Dashboard.tsx         # SPA view controller + search + compare
│   │   ├── CompanyCard.tsx       # Company cards with sparklines
│   │   ├── ComparisonChart.tsx   # Multi-company overlay charts
│   │   ├── FinancialChart.tsx    # Single company charts
│   │   └── RiskKeywords.tsx      # Risk factor display
│   └── lib/
│       └── supabase.ts           # Database client
├── scripts/
│   └── ingest_filings.py         # ETL pipeline
├── sql/
│   └── schema.sql                # Database schema
└── README.md
```

---

## Future Enhancements

- [ ] GitHub Actions scheduled ETL (daily/weekly data refresh)
- [ ] Additional filing types (10-Q, 8-K)
- [ ] Historical data expansion (more fiscal years)
- [ ] Advanced filtering (by sector, market cap, profitability)

---

## Author

**Flach** — Data Engineering & Full-Stack Development

---

## Acknowledgments

- [SEC EDGAR](https://www.sec.gov/edgar) for public financial data
- [Supabase](https://supabase.com) for database hosting
- [Vercel](https://vercel.com) for deployment
