-- SEC EDGAR Analyzer - Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Companies we're tracking
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  cik VARCHAR(20) NOT NULL,  -- SEC Central Index Key
  sector VARCHAR(100),
  industry VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual SEC filings
CREATE TABLE filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  filing_type VARCHAR(10) NOT NULL,  -- 10-K, 10-Q, 8-K
  filing_date DATE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_period VARCHAR(10),  -- FY, Q1, Q2, Q3, Q4
  accession_number VARCHAR(30),  -- SEC unique identifier
  source_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, filing_type, fiscal_year, fiscal_period)
);

-- Extracted financial metrics
CREATE TABLE financial_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES filings(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC,
  unit VARCHAR(20) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(filing_id, metric_name)
);

-- Risk factor keyword tracking
CREATE TABLE risk_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES filings(id) ON DELETE CASCADE,
  keyword VARCHAR(100) NOT NULL,
  frequency INTEGER DEFAULT 0,
  section VARCHAR(50) DEFAULT 'risk_factors',  -- risk_factors, mdna, etc.
  context_snippet TEXT,  -- sample sentence for context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(filing_id, keyword, section)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_companies_ticker ON companies(ticker);
CREATE INDEX idx_companies_cik ON companies(cik);
CREATE INDEX idx_filings_company_id ON filings(company_id);
CREATE INDEX idx_filings_date ON filings(filing_date DESC);
CREATE INDEX idx_filings_type ON filings(filing_type);
CREATE INDEX idx_metrics_filing_id ON financial_metrics(filing_id);
CREATE INDEX idx_metrics_name ON financial_metrics(metric_name);
CREATE INDEX idx_risk_keywords_filing_id ON risk_keywords(filing_id);
CREATE INDEX idx_risk_keywords_keyword ON risk_keywords(keyword);

-- ============================================
-- VIEWS (for easy querying)
-- ============================================

-- Company metrics over time
CREATE VIEW company_metrics_timeline AS
SELECT 
  c.ticker,
  c.name,
  f.fiscal_year,
  f.filing_date,
  fm.metric_name,
  fm.metric_value,
  fm.unit
FROM companies c
JOIN filings f ON c.id = f.company_id
JOIN financial_metrics fm ON f.id = fm.filing_id
WHERE f.filing_type = '10-K'
ORDER BY c.ticker, f.fiscal_year DESC, fm.metric_name;

-- Risk keyword trends
CREATE VIEW risk_keyword_trends AS
SELECT 
  c.ticker,
  c.name,
  f.fiscal_year,
  rk.keyword,
  rk.frequency,
  rk.section
FROM companies c
JOIN filings f ON c.id = f.company_id
JOIN risk_keywords rk ON f.id = rk.filing_id
WHERE f.filing_type = '10-K'
ORDER BY c.ticker, f.fiscal_year DESC, rk.frequency DESC;

-- Latest metrics per company
CREATE VIEW latest_company_metrics AS
SELECT DISTINCT ON (c.ticker, fm.metric_name)
  c.ticker,
  c.name,
  f.fiscal_year,
  fm.metric_name,
  fm.metric_value,
  fm.unit
FROM companies c
JOIN filings f ON c.id = f.company_id
JOIN financial_metrics fm ON f.id = fm.filing_id
WHERE f.filing_type = '10-K'
ORDER BY c.ticker, fm.metric_name, f.fiscal_year DESC;

-- ============================================
-- SEED DATA (MVP Companies)
-- ============================================

INSERT INTO companies (ticker, name, cik, sector, industry) VALUES
  ('AAPL', 'Apple Inc.', '0000320193', 'Technology', 'Consumer Electronics'),
  ('MSFT', 'Microsoft Corporation', '0000789019', 'Technology', 'Software'),
  ('GOOGL', 'Alphabet Inc.', '0001652044', 'Technology', 'Internet Services'),
  ('AMZN', 'Amazon.com Inc.', '0001018724', 'Consumer Cyclical', 'E-Commerce'),
  ('META', 'Meta Platforms Inc.', '0001326801', 'Technology', 'Social Media'),
  ('NVDA', 'NVIDIA Corporation', '0001045810', 'Technology', 'Semiconductors'),
  ('TSLA', 'Tesla Inc.', '0001318605', 'Consumer Cyclical', 'Auto Manufacturers'),
  ('JPM', 'JPMorgan Chase & Co.', '0000019617', 'Financial Services', 'Banks'),
  ('JNJ', 'Johnson & Johnson', '0000200406', 'Healthcare', 'Drug Manufacturers'),
  ('WMT', 'Walmart Inc.', '0000104169', 'Consumer Defensive', 'Retail')
ON CONFLICT (ticker) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (optional, enable if needed)
-- ============================================

-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE filings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE risk_keywords ENABLE ROW LEVEL SECURITY;

-- Public read access (uncomment if using RLS)
-- CREATE POLICY "Public read access" ON companies FOR SELECT USING (true);
-- CREATE POLICY "Public read access" ON filings FOR SELECT USING (true);
-- CREATE POLICY "Public read access" ON financial_metrics FOR SELECT USING (true);
-- CREATE POLICY "Public read access" ON risk_keywords FOR SELECT USING (true);
