import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Lead = {
  id: string;
  created_at: string;
  nome: string | null;
  telefone: string | null;
  qualificado: boolean | null;
  botativo: boolean | null;
  cliente: string | null;
  fonte: string | null;
};

export type Fonte = {
  id: string;
  fonte: string;
  nome: string;
  created_at: string;
  updated_at: string;
};

export type FollowUpLead = {
  id: number;
  data: string;
  nome: string;
  fonte: number;
  telefone: string;
  company_id: string | null;
  etapa_1: string | null;
  etapa_2: string | null;
  etapa_3: string | null;
  etapa_4: string | null;
  etapa_5: string | null;
  etapa_6: string | null;
  etapa_7: string | null;
  observacao: string;
  data_qualificacao: string | null;
};
