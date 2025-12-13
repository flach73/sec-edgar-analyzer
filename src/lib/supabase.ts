import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export interface Company {
  id: string;
  ticker: string;
  name: string;
  cik: string;
  sector: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
}

export interface Filing {
  id: string;
  company_id: string;
  filing_type: string;
  filing_date: string;
  fiscal_year: number;
  fiscal_period: string | null;
  accession_number: string | null;
  source_url: string;
  created_at: string;
}

export interface FinancialMetric {
  id: string;
  filing_id: string;
  metric_name: string;
  metric_value: number | null;
  unit: string;
  created_at: string;
}

export interface RiskKeyword {
  id: string;
  filing_id: string;
  keyword: string;
  frequency: number;
  section: string;
  context_snippet: string | null;
  created_at: string;
}

export const TRACKED_METRICS = [
  'revenue',
  'net_income',
  'total_assets',
  'total_liabilities',
  'cash_and_equivalents',
] as const;

export const TRACKED_KEYWORDS = [
  'supply chain',
  'inflation',
  'cybersecurity',
  'litigation',
  'regulation',
  'competition',
  'climate',
  'pandemic',
  'geopolitical',
  'interest rate',
] as const;

export type MetricName = typeof TRACKED_METRICS[number];
export type KeywordName = typeof TRACKED_KEYWORDS[number];
