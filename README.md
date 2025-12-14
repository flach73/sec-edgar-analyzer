# SEC EDGAR Analyzer

A full-stack data engineering project that extracts, transforms, and visualizes financial metrics and risk factors from SEC 10-K filings.

![SEC EDGAR Analyzer](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

## Features

- **Financial Metrics Extraction**: Revenue, Net Income, Total Assets, Liabilities, Cash
- **Risk Factor Analysis**: Keyword frequency tracking across filings
- **Multi-Year Trends**: Track changes over time
- **Company Comparison**: Side-by-side analysis
- **Real SEC Data**: Direct from EDGAR API

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Data Pipeline | Python, BeautifulSoup, Requests |
| Charts | Recharts |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- Supabase account

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/sec-edgar-analyzer.git
cd sec-edgar-analyzer
npm install
pip install -r requirements.txt
```

### 2. Set Up Supabase

1. Create a new Supabase project
2. Run the schema SQL in `sql/schema.sql`
3. Copy your credentials

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Data Ingestion

```bash
python scripts/ingest_filings.py
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
sec-edgar-analyzer/
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── company/       # Company detail pages
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/        # React components
│   └── lib/
│       └── supabase.ts    # Database client
├── scripts/
│   └── ingest_filings.py  # Data pipeline
├── sql/
│   └── schema.sql         # Database schema
└── README.md
```

## Data Pipeline

```
SEC EDGAR API → Python Parser → Supabase → Next.js API → React Frontend
```

### Metrics Tracked

| Metric | Description |
|--------|-------------|
| Revenue | Total revenue/sales |
| Net Income | Bottom line profit |
| Total Assets | Everything owned |
| Total Liabilities | Everything owed |
| Cash & Equivalents | Liquid assets |

### Risk Keywords

- Supply Chain
- Inflation
- Cybersecurity
- Litigation
- Regulation
- Competition
- Climate
- Pandemic
- Geopolitical
- Interest Rate

## Companies (MVP)

AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA, JPM, JNJ, WMT

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/companies` | List all companies |
| `GET /api/company/[ticker]` | Company details + filings |
| `GET /api/metrics/[ticker]` | Financial metrics time series |
| `GET /api/risks/[ticker]` | Risk keyword frequencies |

## Deployment

### Vercel

```bash
vercel --prod
```

Add environment variables in Vercel dashboard.

## License

MIT

## Acknowledgments

- Data from [SEC EDGAR](https://www.sec.gov/edgar)
- Built with [Next.js](https://nextjs.org) and [Supabase](https://supabase.com)
 
