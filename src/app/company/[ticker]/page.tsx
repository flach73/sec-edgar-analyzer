import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import FinancialChart from '@/components/FinancialChart';
import RiskKeywords from '@/components/RiskKeywords';

interface PageProps {
  params: Promise<{ ticker: string }>;
}

async function getCompanyByTicker(ticker: string) {
  // Get company
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .ilike('ticker', ticker)
    .single();

  if (error || !company) {
    return null;
  }

  // Get filings for this company
  const { data: filings } = await supabase
    .from('filings')
    .select('*')
    .eq('company_id', company.id)
    .order('fiscal_year', { ascending: true });

  // Get metrics and keywords for each filing
  const filingsWithData = await Promise.all(
    (filings || []).map(async (filing) => {
      // Get financial metrics
      const { data: metrics } = await supabase
        .from('financial_metrics')
        .select('*')
        .eq('filing_id', filing.id);

      // Get risk keywords
      const { data: keywords } = await supabase
        .from('risk_keywords')
        .select('*')
        .eq('filing_id', filing.id);

      // Transform metrics into expected format
      const metricsMap: Record<string, number | null> = {};
      (metrics || []).forEach((m) => {
        metricsMap[m.metric_name] = m.metric_value;
      });

      return {
        ...filing,
        total_revenue: metricsMap['revenue'] || null,
        net_income: metricsMap['net_income'] || null,
        total_assets: metricsMap['total_assets'] || null,
        total_liabilities: metricsMap['total_liabilities'] || null,
        risk_keywords: (keywords || []).map((k) => k.keyword),
        filing_url: filing.source_url,
      };
    })
  );

  return {
    ...company,
    filings: filingsWithData,
  };
}

function formatCurrency(value: number | null): string {
  if (value === null) return 'N/A';
  if (Math.abs(value) >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  return `$${value.toLocaleString()}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function CompanyPage({ params }: PageProps) {
  const { ticker } = await params;
  const company = await getCompanyByTicker(ticker);

  if (!company) {
    notFound();
  }

  const latestFiling = company.filings?.[company.filings.length - 1];

  // Calculate YoY growth if we have multiple years
  const previousFiling = company.filings?.[company.filings.length - 2];
  const revenueGrowth =
    latestFiling?.total_revenue && previousFiling?.total_revenue
      ? (
          ((latestFiling.total_revenue - previousFiling.total_revenue) /
            previousFiling.total_revenue) *
          100
        ).toFixed(1)
      : null;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-4">
            <Link href="/" className="text-sm text-blue-600 hover:underline">
              ← Back to Dashboard
            </Link>
          </nav>

          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  {company.ticker}
                </h1>
                {company.sector && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {company.sector}
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1">{company.name}</p>
              <p className="text-sm text-gray-400 mt-1">CIK: {company.cik}</p>
            </div>

            {latestFiling?.filing_url && (
              <a
                href={latestFiling.filing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View Latest 10-K →
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Key Metrics */}
        {latestFiling && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">
                Revenue (FY{latestFiling.fiscal_year})
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(latestFiling.total_revenue)}
              </p>
              {revenueGrowth && (
                <p
                  className={`text-sm ${
                    parseFloat(revenueGrowth) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {parseFloat(revenueGrowth) >= 0 ? '↑' : '↓'}{' '}
                  {Math.abs(parseFloat(revenueGrowth))}% YoY
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Net Income</p>
              <p
                className={`text-2xl font-bold ${
                  latestFiling.net_income && latestFiling.net_income > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {formatCurrency(latestFiling.net_income)}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(latestFiling.total_assets)}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Profit Margin</p>
              <p
                className={`text-2xl font-bold ${
                  latestFiling.total_revenue &&
                  latestFiling.net_income &&
                  latestFiling.net_income / latestFiling.total_revenue > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {latestFiling.total_revenue && latestFiling.net_income
                  ? `${(
                      (latestFiling.net_income / latestFiling.total_revenue) *
                      100
                    ).toFixed(1)}%`
                  : 'N/A'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Charts */}
          <div className="lg:col-span-2 space-y-6">
            {company.filings && company.filings.length > 0 && (
              <FinancialChart filings={company.filings} />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Risk Keywords */}
            {latestFiling?.risk_keywords &&
              latestFiling.risk_keywords.length > 0 && (
                <RiskKeywords keywords={latestFiling.risk_keywords} />
              )}

            {/* Filing History */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Filing History
              </h3>
              <div className="space-y-3">
                {company.filings
                  ?.slice()
                  .reverse()
                  .map((filing: any) => (
                    <div
                      key={filing.id}
                      className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          FY {filing.fiscal_year}
                        </p>
                        <p className="text-xs text-gray-500">
                          Filed {formatDate(filing.filing_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(filing.total_revenue)}
                        </p>
                        <p
                          className={`text-xs ${
                            filing.net_income > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(filing.net_income)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { ticker } = await params;
  const company = await getCompanyByTicker(ticker);

  if (!company) {
    return { title: 'Company Not Found' };
  }

  return {
    title: `${company.ticker} - ${company.name} | SEC Analyzer`,
    description: `View financial metrics and risk analysis for ${company.name} (${company.ticker}) extracted from SEC 10-K filings.`,
  };
}
