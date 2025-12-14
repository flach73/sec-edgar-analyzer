'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Filing {
  fiscal_year: number;
  total_revenue: number | null;
  net_income: number | null;
  total_assets: number | null;
}

interface Company {
  id: string;
  ticker: string;
  name: string;
  sector: string | null;
  filings?: Filing[];
}

interface ComparisonChartProps {
  companies: Company[];
}

// Color palette for different companies
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

function formatYAxis(value: number): string {
  if (Math.abs(value) >= 1e12) {
    return `$${(value / 1e12).toFixed(1)}T`;
  }
  if (Math.abs(value) >= 1e9) {
    return `$${(value / 1e9).toFixed(0)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(0)}M`;
  }
  return `$${value}`;
}

function formatTooltip(value: number): string {
  if (Math.abs(value) >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  }
  if (Math.abs(value) >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  return `$${value.toLocaleString()}`;
}

export default function ComparisonChart({ companies }: ComparisonChartProps) {
  // Get all unique fiscal years across all companies
  const allYears = new Set<number>();
  companies.forEach((company) => {
    company.filings?.forEach((filing) => {
      allYears.add(filing.fiscal_year);
    });
  });
  const sortedYears = Array.from(allYears).sort((a, b) => a - b);

  // Build combined data structure for charts
  const revenueData = sortedYears.map((year) => {
    const dataPoint: Record<string, number | string | null> = { year: `FY${year}` };
    companies.forEach((company) => {
      const filing = company.filings?.find((f) => f.fiscal_year === year);
      dataPoint[company.ticker] = filing?.total_revenue ?? null;
    });
    return dataPoint;
  });

  const netIncomeData = sortedYears.map((year) => {
    const dataPoint: Record<string, number | string | null> = { year: `FY${year}` };
    companies.forEach((company) => {
      const filing = company.filings?.find((f) => f.fiscal_year === year);
      dataPoint[company.ticker] = filing?.net_income ?? null;
    });
    return dataPoint;
  });

  const assetsData = sortedYears.map((year) => {
    const dataPoint: Record<string, number | string | null> = { year: `FY${year}` };
    companies.forEach((company) => {
      const filing = company.filings?.find((f) => f.fiscal_year === year);
      dataPoint[company.ticker] = filing?.total_assets ?? null;
    });
    return dataPoint;
  });

  const marginData = sortedYears.map((year) => {
    const dataPoint: Record<string, number | string | null> = { year: `FY${year}` };
    companies.forEach((company) => {
      const filing = company.filings?.find((f) => f.fiscal_year === year);
      if (filing?.total_revenue && filing?.net_income) {
        dataPoint[company.ticker] = (filing.net_income / filing.total_revenue) * 100;
      } else {
        dataPoint[company.ticker] = null;
      }
    });
    return dataPoint;
  });

  const tickers = companies.map((c) => c.ticker);

  return (
    <div className="space-y-6">
      {/* Revenue Comparison */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Revenue Comparison</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatTooltip(value), name]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend />
              {tickers.map((ticker, idx) => (
                <Line
                  key={ticker}
                  type="monotone"
                  dataKey={ticker}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[idx % COLORS.length], strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Net Income Comparison */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Net Income Comparison</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={netIncomeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatTooltip(value), name]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend />
              {tickers.map((ticker, idx) => (
                <Line
                  key={ticker}
                  type="monotone"
                  dataKey={ticker}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[idx % COLORS.length], strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Total Assets Comparison */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Total Assets Comparison</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={assetsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatTooltip(value), name]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend />
              {tickers.map((ticker, idx) => (
                <Line
                  key={ticker}
                  type="monotone"
                  dataKey={ticker}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[idx % COLORS.length], strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profit Margin Comparison */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Profit Margin Comparison</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={marginData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend />
              {tickers.map((ticker, idx) => (
                <Line
                  key={ticker}
                  type="monotone"
                  dataKey={ticker}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[idx % COLORS.length], strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
