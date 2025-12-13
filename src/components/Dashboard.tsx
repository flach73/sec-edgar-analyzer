'use client';

import { useState } from 'react';
import CompanyCard from './CompanyCard';
import FinancialChart from './FinancialChart';
import RiskKeywords from './RiskKeywords';

interface Filing {
  id: string;
  fiscal_year: number;
  filing_date: string;
  total_revenue: number | null;
  net_income: number | null;
  total_assets: number | null;
  risk_keywords: string[];
  filing_url?: string;
}

interface Company {
  id: string;
  ticker: string;
  name: string;
  sector: string | null;
  cik: string;
  filings?: Filing[];
}

interface DashboardProps {
  companies: Company[];
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

export default function Dashboard({ companies }: DashboardProps) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [view, setView] = useState<'grid' | 'detail'>('grid');

  const handleCardClick = (company: Company) => {
    setSelectedCompany(company);
    setView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setView('grid');
    setTimeout(() => setSelectedCompany(null), 300);
  };

  // Calculate aggregate stats
  const totalFilings = companies.reduce(
    (acc, c) => acc + (c.filings?.length || 0),
    0
  );

  const companiesWithData = companies.filter(
    (c) => c.filings && c.filings.length > 0
  ).length;

  // Detail view data
  const sortedFilings = selectedCompany?.filings?.slice().sort((a, b) => a.fiscal_year - b.fiscal_year) || [];
  const latestFiling = sortedFilings[sortedFilings.length - 1];
  const previousFiling = sortedFilings[sortedFilings.length - 2];
  const revenueGrowth =
    latestFiling?.total_revenue && previousFiling?.total_revenue
      ? (((latestFiling.total_revenue - previousFiling.total_revenue) / previousFiling.total_revenue) * 100).toFixed(1)
      : null;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section - Always visible but content changes */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          {view === 'grid' ? (
            <>
              <h1 className="text-4xl font-bold mb-4">SEC EDGAR Analyzer</h1>
              <p className="text-xl text-blue-100 max-w-2xl">
                Financial metrics and risk analysis extracted from SEC 10-K filings.
                Explore revenue trends, profitability, and key risk factors across
                publicly traded companies.
              </p>

              {/* Stats */}
              <div className="mt-8 grid grid-cols-3 gap-8 max-w-lg">
                <div>
                  <p className="text-3xl font-bold">{companies.length}</p>
                  <p className="text-blue-200 text-sm">Companies</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{totalFilings}</p>
                  <p className="text-blue-200 text-sm">10-K Filings</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{companiesWithData}</p>
                  <p className="text-blue-200 text-sm">With Data</p>
                </div>
              </div>
            </>
          ) : selectedCompany && (
            <>
              {/* Back button */}
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>

              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-bold">{selectedCompany.ticker}</h1>
                {selectedCompany.sector && (
                  <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                    {selectedCompany.sector}
                  </span>
                )}
              </div>
              <p className="text-xl text-blue-100 mt-2">{selectedCompany.name}</p>
              <p className="text-blue-300 text-sm mt-1">CIK: {selectedCompany.cik}</p>
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Grid View */}
        <div
          className={`transition-all duration-300 ${
            view === 'grid'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 hidden'
          }`}
        >
          {/* Section Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">All Companies</h2>
            <p className="text-sm text-gray-500">
              Click any card to view detailed financials
            </p>
          </div>

          {/* Company Grid */}
          {companies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg shadow">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No companies found
              </h3>
              <p className="mt-2 text-gray-500">
                Run the ingestion script to populate data from SEC EDGAR.
              </p>
              <div className="mt-4 bg-gray-50 rounded p-4 max-w-md mx-auto">
                <code className="text-sm text-gray-600">
                  python scripts/ingest_filings.py
                </code>
              </div>
            </div>
          )}

          {/* Data Source Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Data sourced from{' '}
              <a
                href="https://www.sec.gov/edgar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                SEC EDGAR
              </a>
              {' '}• Last updated automatically via ETL pipeline
            </p>
          </div>
        </div>

        {/* Detail View */}
        <div
          className={`transition-all duration-300 ${
            view === 'detail'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 hidden'
          }`}
        >
          {selectedCompany && (
            <>
              {/* Key Metrics */}
              {latestFiling && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Revenue (FY{latestFiling.fiscal_year})</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(latestFiling.total_revenue)}
                    </p>
                    {revenueGrowth && (
                      <p className={`text-sm ${parseFloat(revenueGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(revenueGrowth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(revenueGrowth))}% YoY
                      </p>
                    )}
                  </div>

                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Net Income</p>
                    <p className={`text-2xl font-bold ${
                      latestFiling.net_income && latestFiling.net_income > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
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
                    <p className={`text-2xl font-bold ${
                      latestFiling.total_revenue && latestFiling.net_income &&
                      (latestFiling.net_income / latestFiling.total_revenue) > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {latestFiling.total_revenue && latestFiling.net_income
                        ? `${((latestFiling.net_income / latestFiling.total_revenue) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Charts */}
                <div className="lg:col-span-2 space-y-6">
                  {sortedFilings.length > 0 && (
                    <FinancialChart filings={sortedFilings} />
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Risk Keywords */}
                  {latestFiling?.risk_keywords && latestFiling.risk_keywords.length > 0 && (
                    <RiskKeywords keywords={latestFiling.risk_keywords} />
                  )}

                  {/* Filing History */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Filing History</h3>
                    <div className="space-y-3">
                      {sortedFilings.slice().reverse().map((filing) => (
                        <div
                          key={filing.id}
                          className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                        >
                          <div>
                            <p className="font-medium text-gray-900">FY {filing.fiscal_year}</p>
                            <p className="text-xs text-gray-500">Filed {formatDate(filing.filing_date)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(filing.total_revenue)}
                            </p>
                            <p className={`text-xs ${filing.net_income && filing.net_income > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(filing.net_income)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
