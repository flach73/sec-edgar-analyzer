'use client';

import { useState, useMemo } from 'react';
import CompanyCard from './CompanyCard';
import FinancialChart from './FinancialChart';
import RiskKeywords from './RiskKeywords';
import ComparisonChart from './ComparisonChart';

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

// Color palette matching ComparisonChart
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

function getLatestFiling(filings?: Filing[]): Filing | null {
  if (!filings || filings.length === 0) return null;
  return filings.reduce((latest, current) =>
    current.fiscal_year > latest.fiscal_year ? current : latest
  );
}

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function formatCSVValue(value: number | null): string {
  if (value === null) return '';
  return value.toString();
}

export default function Dashboard({ companies }: DashboardProps) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [view, setView] = useState<'grid' | 'detail' | 'compare'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<Company[]>([]);

  // Filter companies based on search query
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    
    const query = searchQuery.toLowerCase().trim();
    return companies.filter(
      (company) =>
        company.ticker.toLowerCase().includes(query) ||
        company.name.toLowerCase().includes(query) ||
        (company.sector && company.sector.toLowerCase().includes(query))
    );
  }, [companies, searchQuery]);

  const handleCardClick = (company: Company) => {
    setSelectedCompany(company);
    setView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (view === 'compare') {
      setView('grid');
      setComparisonMode(false);
      setSelectedForComparison([]);
    } else {
      setView('grid');
      setTimeout(() => setSelectedCompany(null), 300);
    }
  };

  const handleSelectForComparison = (company: Company) => {
    setSelectedForComparison((prev) => {
      const isSelected = prev.some((c) => c.id === company.id);
      if (isSelected) {
        return prev.filter((c) => c.id !== company.id);
      } else {
        return [...prev, company];
      }
    });
  };

  const handleToggleComparisonMode = () => {
    if (comparisonMode) {
      // Exiting comparison mode - clear selections
      setComparisonMode(false);
      setSelectedForComparison([]);
    } else {
      // Entering comparison mode
      setComparisonMode(true);
    }
  };

  const handleStartComparison = () => {
    if (selectedForComparison.length >= 2) {
      setView('compare');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRemoveFromComparison = (companyId: string) => {
    setSelectedForComparison((prev) => prev.filter((c) => c.id !== companyId));
    // If less than 2 companies remain, go back to grid
    if (selectedForComparison.length <= 2) {
      setView('grid');
    }
  };

  const handleExportComparison = () => {
    const headers = ['Metric', ...selectedForComparison.map(c => c.ticker)];
    const rows = [
      ['Company Name', ...selectedForComparison.map(c => c.name)],
      ['Sector', ...selectedForComparison.map(c => c.sector || '')],
      ['Fiscal Year', ...selectedForComparison.map(c => {
        const latest = getLatestFiling(c.filings);
        return latest ? `FY ${latest.fiscal_year}` : '';
      })],
      ['Revenue', ...selectedForComparison.map(c => {
        const latest = getLatestFiling(c.filings);
        return formatCSVValue(latest?.total_revenue ?? null);
      })],
      ['Net Income', ...selectedForComparison.map(c => {
        const latest = getLatestFiling(c.filings);
        return formatCSVValue(latest?.net_income ?? null);
      })],
      ['Total Assets', ...selectedForComparison.map(c => {
        const latest = getLatestFiling(c.filings);
        return formatCSVValue(latest?.total_assets ?? null);
      })],
      ['Profit Margin %', ...selectedForComparison.map(c => {
        const latest = getLatestFiling(c.filings);
        if (latest?.total_revenue && latest?.net_income) {
          return ((latest.net_income / latest.total_revenue) * 100).toFixed(2);
        }
        return '';
      })],
    ];

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const tickers = selectedForComparison.map(c => c.ticker).join('_');
    downloadCSV(`comparison_${tickers}_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
  };

  const handleExportCompanyFilings = () => {
    if (!selectedCompany) return;

    const headers = ['Fiscal Year', 'Filing Date', 'Revenue', 'Net Income', 'Total Assets', 'Profit Margin %'];
    const rows = sortedFilings.map(filing => [
      filing.fiscal_year.toString(),
      filing.filing_date,
      formatCSVValue(filing.total_revenue),
      formatCSVValue(filing.net_income),
      formatCSVValue(filing.total_assets),
      filing.total_revenue && filing.net_income
        ? ((filing.net_income / filing.total_revenue) * 100).toFixed(2)
        : '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    downloadCSV(`${selectedCompany.ticker}_filings_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
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
      {/* Hero Section */}
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
          ) : view === 'compare' ? (
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

              <h1 className="text-4xl font-bold mb-2">Company Comparison</h1>
              <p className="text-xl text-blue-100">
                Comparing {selectedForComparison.length} companies side-by-side
              </p>

              {/* Selected companies pills */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {selectedForComparison.map((company, idx) => (
                  <span
                    key={company.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ backgroundColor: COLORS[idx % COLORS.length], color: 'white' }}
                  >
                    {company.ticker}
                    <button
                      onClick={() => handleRemoveFromComparison(company.id)}
                      className="hover:bg-white/20 rounded-full p-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                
                {/* Export CSV Button */}
                <button
                  onClick={handleExportComparison}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
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
          {/* Section Header with Search and Compare Toggle */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">All Companies</h2>
                <p className="text-sm text-gray-500">
                  {comparisonMode
                    ? `Select 2 or more companies to compare (${selectedForComparison.length} selected)`
                    : searchQuery
                    ? `Showing ${filteredCompanies.length} of ${companies.length} companies`
                    : 'Click any card to view detailed financials'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Compare Toggle Button */}
                <button
                  onClick={handleToggleComparisonMode}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    comparisonMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {comparisonMode ? 'Cancel' : 'Compare'}
                </button>
              </div>
            </div>
          </div>

          {/* Company Grid */}
          {filteredCompanies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompanies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onClick={handleCardClick}
                  selectable={comparisonMode}
                  selected={selectedForComparison.some((c) => c.id === company.id)}
                  onSelect={handleSelectForComparison}
                />
              ))}
            </div>
          ) : searchQuery ? (
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No companies match "{searchQuery}"
              </h3>
              <p className="mt-2 text-gray-500">
                Try searching by ticker symbol, company name, or sector.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Search
              </button>
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

        {/* Comparison Floating Bar */}
        {comparisonMode && view === 'grid' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {selectedForComparison.length} companies selected
                  </span>
                  {selectedForComparison.length > 0 && (
                    <div className="flex items-center gap-2">
                      {selectedForComparison.map((company, idx) => (
                        <span
                          key={company.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        >
                          {company.ticker}
                          <button
                            onClick={() => handleSelectForComparison(company)}
                            className="hover:bg-white/20 rounded-full"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleStartComparison}
                  disabled={selectedForComparison.length < 2}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    selectedForComparison.length >= 2
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Compare {selectedForComparison.length >= 2 ? `(${selectedForComparison.length})` : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add padding at bottom when floating bar is visible */}
        {comparisonMode && view === 'grid' && <div className="h-20" />}

        {/* Comparison View */}
        <div
          className={`transition-all duration-300 ${
            view === 'compare'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 hidden'
          }`}
        >
          {selectedForComparison.length >= 2 && (
            <>
              {/* Side-by-side Metrics Cards */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest Metrics</h3>
                <div className="overflow-x-auto">
                  <table className="w-full bg-white rounded-lg shadow">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-4 font-medium text-gray-500">Metric</th>
                        {selectedForComparison.map((company, idx) => (
                          <th 
                            key={company.id} 
                            className="text-right p-4 font-bold"
                            style={{ color: COLORS[idx % COLORS.length] }}
                          >
                            {company.ticker}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 text-gray-600">Fiscal Year</td>
                        {selectedForComparison.map((company) => {
                          const latest = getLatestFiling(company.filings);
                          return (
                            <td key={company.id} className="p-4 text-right font-medium">
                              {latest ? `FY ${latest.fiscal_year}` : 'N/A'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 text-gray-600">Revenue</td>
                        {selectedForComparison.map((company) => {
                          const latest = getLatestFiling(company.filings);
                          return (
                            <td key={company.id} className="p-4 text-right font-medium">
                              {formatCurrency(latest?.total_revenue ?? null)}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 text-gray-600">Net Income</td>
                        {selectedForComparison.map((company) => {
                          const latest = getLatestFiling(company.filings);
                          const value = latest?.net_income ?? null;
                          return (
                            <td 
                              key={company.id} 
                              className={`p-4 text-right font-medium ${
                                value !== null && value > 0 ? 'text-green-600' : value !== null ? 'text-red-600' : ''
                              }`}
                            >
                              {formatCurrency(value)}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-4 text-gray-600">Total Assets</td>
                        {selectedForComparison.map((company) => {
                          const latest = getLatestFiling(company.filings);
                          return (
                            <td key={company.id} className="p-4 text-right font-medium">
                              {formatCurrency(latest?.total_assets ?? null)}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-4 text-gray-600">Profit Margin</td>
                        {selectedForComparison.map((company) => {
                          const latest = getLatestFiling(company.filings);
                          const margin = latest?.total_revenue && latest?.net_income
                            ? ((latest.net_income / latest.total_revenue) * 100).toFixed(1)
                            : null;
                          return (
                            <td 
                              key={company.id} 
                              className={`p-4 text-right font-medium ${
                                margin !== null && parseFloat(margin) > 0 ? 'text-green-600' : margin !== null ? 'text-red-600' : ''
                              }`}
                            >
                              {margin !== null ? `${margin}%` : 'N/A'}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Comparison Charts */}
              <ComparisonChart companies={selectedForComparison} />
            </>
          )}
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
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-900">Filing History</h3>
                      <button
                        onClick={handleExportCompanyFilings}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export
                      </button>
                    </div>
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
