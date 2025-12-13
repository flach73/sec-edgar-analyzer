'use client';

interface RiskKeywordsProps {
  keywords: string[];
}

// Map common risk keywords to severity levels
const severityMap: Record<string, 'high' | 'medium' | 'low'> = {
  'cybersecurity': 'high',
  'cyber': 'high',
  'litigation': 'high',
  'lawsuit': 'high',
  'regulatory': 'high',
  'compliance': 'medium',
  'competition': 'medium',
  'market': 'low',
  'economic': 'medium',
  'supply chain': 'high',
  'inflation': 'medium',
  'interest rate': 'medium',
  'currency': 'low',
  'talent': 'low',
  'pandemic': 'high',
  'climate': 'medium',
  'geopolitical': 'high',
  'default': 'low',
};

function getSeverity(keyword: string): 'high' | 'medium' | 'low' {
  const lowerKeyword = keyword.toLowerCase();
  for (const [key, severity] of Object.entries(severityMap)) {
    if (lowerKeyword.includes(key)) {
      return severity;
    }
  }
  return 'low';
}

function getSeverityStyles(severity: 'high' | 'medium' | 'low'): string {
  switch (severity) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export default function RiskKeywords({ keywords }: RiskKeywordsProps) {
  // Sort keywords by severity
  const sortedKeywords = [...keywords].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[getSeverity(a)] - severityOrder[getSeverity(b)];
  });

  const highCount = keywords.filter(k => getSeverity(k) === 'high').length;
  const mediumCount = keywords.filter(k => getSeverity(k) === 'medium').length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-gray-900">Risk Factors</h3>
        <span className="text-xs text-gray-500">{keywords.length} identified</span>
      </div>

      {/* Severity Summary */}
      <div className="flex gap-4 mb-4 text-xs">
        {highCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-gray-600">{highCount} High</span>
          </div>
        )}
        {mediumCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span className="text-gray-600">{mediumCount} Medium</span>
          </div>
        )}
      </div>

      {/* Keywords List */}
      <div className="flex flex-wrap gap-2">
        {sortedKeywords.map((keyword, idx) => {
          const severity = getSeverity(keyword);
          return (
            <span
              key={idx}
              className={`px-3 py-1 text-sm rounded-full border ${getSeverityStyles(severity)}`}
              title={`Severity: ${severity}`}
            >
              {keyword}
            </span>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Risk factors are extracted from the company&apos;s 10-K filing &quot;Risk Factors&quot; section 
          and categorized by potential business impact.
        </p>
      </div>
    </div>
  );
}
