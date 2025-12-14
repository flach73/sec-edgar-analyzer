'use client';

import {
  LineChart,
  Line,
  YAxis,
} from 'recharts';

interface Filing {
  id: string;
  fiscal_year: number;
  filing_date: string;
  total_revenue: number | null;
  net_income: number | null;
  total_assets: number | null;
  risk_keywords: string[];
}

interface Company {
  id: string;
  ticker: string;
  name: string;
  sector: string | null;
  cik: string;
  filings?: Filing[];
}

interface CompanyCardProps {
  company: Company;
  onClick: (company: Company) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (company: Company) => void;
}

function formatCurrency(value: number | null): string {
  if (value === null) return 'N/A';
  if (Math.abs(value) >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  return `$${value.toLocaleString()}`;
}

function getSortedFilings(filings?: Filing[]): Filing[] {
  if (!filings || filings.length === 0) return [];
  return [...filings].sort((a, b) => a.fiscal_year - b.fiscal_year);
}

function calculateGrowth(current: number | null, previous: number | null): string | null {
  if (current === null || previous === null || previous === 0) return null;
  const growth = ((current - previous) / Math.abs(previous)) * 100;
  return growth.toFixed(1);
}

interface SparklineProps {
  data: { value: number | null }[];
  color: string;
}

function Sparkline({ data, color }: SparklineProps) {
  // Filter out nulls for the chart
  const validData = data.filter(d => d.value !== null);
  
  if (validData.length < 2) {
    return <div className="w-16 h-6" />; // Empty placeholder
  }

  return (
    <LineChart 
      width={64} 
      height={24} 
      data={validData} 
      margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
    >
      <YAxis domain={['dataMin', 'dataMax']} hide />
      <Line
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}

export default function CompanyCard({ 
  company, 
  onClick, 
  selectable = false,
  selected = false,
  onSelect 
}: CompanyCardProps) {
  const sortedFilings = getSortedFilings(company.filings);
  const latestFiling = sortedFilings[sortedFilings.length - 1] || null;
  const previousFiling = sortedFilings[sortedFilings.length - 2] || null;

  const profitMargin =
    latestFiling?.total_revenue && latestFiling?.net_income
      ? ((latestFiling.net_income / latestFiling.total_revenue) * 100).toFixed(1)
      : null;

  const isProfitable = latestFiling?.net_income ? latestFiling.net_income > 0 : null;

  // Calculate growth rates
  const revenueGrowth = calculateGrowth(
    latestFiling?.total_revenue ?? null,
    previousFiling?.total_revenue ?? null
  );
  const incomeGrowth = calculateGrowth(
    latestFiling?.net_income ?? null,
    previousFiling?.net_income ?? null
  );

  // Prepare sparkline data
  const revenueData = sortedFilings.map(f => ({ value: f.total_revenue }));
  const incomeData = sortedFilings.map(f => ({ value: f.net_income }));

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(company);
    } else {
      onClick(company);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(company);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 border-2 cursor-pointer relative ${
        selected 
          ? 'border-blue-500 ring-2 ring-blue-200' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Selection Checkbox */}
      {selectable && (
        <div 
          className="absolute top-3 right-3 z-10"
          onClick={handleCheckboxClick}
        >
          <div
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
              selected
                ? 'bg-blue-500 border-blue-500'
                : 'bg-white border-gray-300 hover:border-blue-400'
            }`}
          >
            {selected && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{company.ticker}</h3>
          <p className="text-sm text-gray-600 line-clamp-1">{company.name}</p>
        </div>
        {company.sector && (
          <span className={`px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded ${selectable ? 'mr-8' : ''}`}>
            {company.sector}
          </span>
        )}
      </div>

      {/* Metrics */}
      {latestFiling ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Latest Filing</span>
            <span className="font-medium">FY {latestFiling.fiscal_year}</span>
          </div>

          {/* Revenue with Sparkline */}
          <div className="bg-gray-50 rounded p-3">
            <div className="flex justify-between items-start mb-1">
              <p className="text-xs text-gray-500">Revenue</p>
              {revenueGrowth && (
                <span className={`text-xs font-medium ${
                  parseFloat(revenueGrowth) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {parseFloat(revenueGrowth) >= 0 ? '↑' : '↓'}{Math.abs(parseFloat(revenueGrowth))}%
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <p className="font-semibold text-gray-900">
                {formatCurrency(latestFiling.total_revenue)}
              </p>
              <Sparkline 
                data={revenueData} 
                color="#3b82f6"
              />
            </div>
          </div>

          {/* Net Income with Sparkline */}
          <div className="bg-gray-50 rounded p-3">
            <div className="flex justify-between items-start mb-1">
              <p className="text-xs text-gray-500">Net Income</p>
              {incomeGrowth && (
                <span className={`text-xs font-medium ${
                  parseFloat(incomeGrowth) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {parseFloat(incomeGrowth) >= 0 ? '↑' : '↓'}{Math.abs(parseFloat(incomeGrowth))}%
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <p className={`font-semibold ${
                isProfitable ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(latestFiling.net_income)}
              </p>
              <Sparkline 
                data={incomeData} 
                color={isProfitable ? '#10b981' : '#ef4444'}
              />
            </div>
          </div>

          {profitMargin && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Profit Margin</span>
              <span
                className={`font-medium ${
                  parseFloat(profitMargin) > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {profitMargin}%
              </span>
            </div>
          )}

          {/* Risk Keywords Preview */}
          {latestFiling.risk_keywords && latestFiling.risk_keywords.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Top Risk Factors</p>
              <div className="flex flex-wrap gap-1">
                {latestFiling.risk_keywords.slice(0, 3).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded"
                  >
                    {keyword}
                  </span>
                ))}
                {latestFiling.risk_keywords.length > 3 && (
                  <span className="text-xs text-gray-400">
                    +{latestFiling.risk_keywords.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-400 text-sm">
          No filings available
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-400">CIK: {company.cik}</span>
        {!selectable && (
          <span className="text-xs text-blue-600 font-medium">View Details →</span>
        )}
        {selectable && (
          <span className="text-xs text-blue-600 font-medium">
            {selected ? 'Selected' : 'Click to select'}
          </span>
        )}
      </div>
    </div>
  );
}
