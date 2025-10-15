import { supabase } from '../lib/supabase';

export const getCompanySourceNumbers = async (companyId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('fontes')
      .select('fonte')
      .eq('company_id', companyId);

    if (error) {
      console.error('Error fetching company sources:', error);
      return [];
    }

    return data?.map(item => item.fonte) || [];
  } catch (error) {
    console.error('Error in getCompanySourceNumbers:', error);
    return [];
  }
};

export const filterLeadsByCompanySources = async (companyId: string) => {
  const sourceNumbers = await getCompanySourceNumbers(companyId);

  if (sourceNumbers.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .in('fonte', sourceNumbers)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error);
    return [];
  }

  return data || [];
};
