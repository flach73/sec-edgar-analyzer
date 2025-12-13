'use client';

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

function getLatestFiling(filings?: Filing[]): Filing | null {
  if (!filings || filings.length === 0) return null;
  return filings.reduce((latest, current) =>
    current.fiscal_year > latest.fiscal_year ? current : latest
  );
}

export default function CompanyCard({ company, onClick }: CompanyCardProps) {
  const latestFiling = getLatestFiling(company.filings);

  const profitMargin =
    latestFiling?.total_revenue && latestFiling?.net_income
      ? ((latestFiling.net_income / latestFiling.total_revenue) * 100).toFixed(1)
      : null;

  const isProfitable = latestFiling?.net_income ? latestFiling.net_income > 0 : null;

  return (
    <div
      onClick={() => onClick(company)}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 cursor-pointer"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{company.ticker}</h3>
          <p className="text-sm text-gray-600 line-clamp-1">{company.name}</p>
        </div>
        {company.sector && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="font-semibold text-gray-900">
                {formatCurrency(latestFiling.total_revenue)}
              </p>
            </div>

            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-500">Net Income</p>
              <p
                className={`font-semibold ${
                  isProfitable ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(latestFiling.net_income)}
              </p>
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
        <span className="text-xs text-blue-600 font-medium">View Details →</span>
      </div>
    </div>
  );
}
