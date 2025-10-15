import { supabase, Fonte } from '../lib/supabase';

interface SourceMapping {
  id: string;
  phoneNumber: string;
  customName: string;
}

const convertFonteToMapping = (fonte: Fonte): SourceMapping => ({
  id: fonte.id,
  phoneNumber: fonte.fonte,
  customName: fonte.nome
});

const convertMappingToFonte = (mapping: SourceMapping, companyId?: string): Omit<Fonte, 'id' | 'created_at' | 'updated_at'> => ({
  fonte: mapping.phoneNumber,
  nome: mapping.customName,
  company_id: companyId || null
});

export const getSourceMappings = async (): Promise<SourceMapping[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('User not authenticated');
      return [];
    }

    const { data: companyUserData } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const companyId = companyUserData?.company_id;

    let query = supabase.from('fontes').select('*');

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching source mappings:', error);
      return [];
    }

    return (data || []).map(convertFonteToMapping);
  } catch (error) {
    console.error('Error loading source mappings:', error);
    return [];
  }
};

export const saveSourceMappings = async (mappings: SourceMapping[], companyId?: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    let userCompanyId = companyId;
    if (!userCompanyId) {
      const { data: companyUserData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      userCompanyId = companyUserData?.company_id;
    }

    if (!userCompanyId) {
      return { success: false, error: 'Company ID not found for user' };
    }

    const existingMappings = await getSourceMappings();
    const existingIds = existingMappings.map(m => m.id);
    const newMappingIds = mappings.map(m => m.id);

    const toDelete = existingIds.filter(id => !newMappingIds.includes(id));
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('fontes')
        .delete()
        .in('id', toDelete);

      if (deleteError) throw deleteError;
    }

    for (const mapping of mappings) {
      const fonteData = convertMappingToFonte(mapping, userCompanyId);

      if (existingIds.includes(mapping.id)) {
        const { error: updateError } = await supabase
          .from('fontes')
          .update(fonteData)
          .eq('id', mapping.id);

        if (updateError) {
          if (updateError.code === '23505') {
            return {
              success: false,
              error: `O número ${mapping.phoneNumber} já está cadastrado por outra empresa.`
            };
          }
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('fontes')
          .insert([fonteData]);

        if (insertError) {
          if (insertError.code === '23505') {
            return {
              success: false,
              error: `O número ${mapping.phoneNumber} já está cadastrado por outra empresa.`
            };
          }
          throw insertError;
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving source mappings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const getSourceDisplayName = async (phoneNumber: string | null): Promise<string> => {
  if (!phoneNumber) return 'Configure Aqui';

  try {
    const mappings = await getSourceMappings();
    const mapping = mappings.find(m => m.phoneNumber === phoneNumber);

    return mapping ? mapping.customName : 'Configure Aqui';
  } catch (error) {
    console.error('Error getting source display name:', error);
    return 'Configure Aqui';
  }
};

let cachedMappings: SourceMapping[] = [];

export const getSourceDisplayNameSync = (phoneNumber: string | number | null): string | null => {
  if (!phoneNumber) return null;

  const phoneStr = String(phoneNumber);

  const mapping = cachedMappings.find(m => m.phoneNumber === phoneStr);

  return mapping ? mapping.customName : null;
};

export const isSourceConfigured = (phoneNumber: string | number | null): boolean => {
  if (!phoneNumber) return false;
  const phoneStr = String(phoneNumber);
  const mapping = cachedMappings.find(m => m.phoneNumber === phoneStr);
  return !!mapping;
};

export const setCachedMappings = (mappings: SourceMapping[]) => {
  cachedMappings = mappings;
};

export const getCachedMappings = (): SourceMapping[] => {
  return cachedMappings;
};
