import { supabase } from '@/lib/supabase';
import Dashboard from '@/components/Dashboard';

export const revalidate = 3600; // Revalidate every hour

async function getCompaniesWithFilings() {
  // Get companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .order('ticker', { ascending: true });

  if (companiesError) {
    console.error('Error fetching companies:', companiesError);
    return [];
  }

  // Get filings with metrics and keywords for each company
  const companiesWithData = await Promise.all(
    (companies || []).map(async (company) => {
      // Get filings for this company
      const { data: filings } = await supabase
        .from('filings')
        .select('*')
        .eq('company_id', company.id)
        .order('fiscal_year', { ascending: false });

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
            risk_keywords: (keywords || []).map((k) => k.keyword),
          };
        })
      );

      return {
        ...company,
        filings: filingsWithData,
      };
    })
  );

  return companiesWithData;
}

export default async function HomePage() {
  const companies = await getCompaniesWithFilings();

  return <Dashboard companies={companies} />;
}
