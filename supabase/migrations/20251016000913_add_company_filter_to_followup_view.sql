/*
  # Adicionar company_id à view vw_leads_followup

  1. Alterações
    - Recriar a view vw_leads_followup para incluir company_id
    - Isso permitirá filtrar os leads de follow-up por empresa

  2. Security
    - A view respeitará as políticas RLS das tabelas subjacentes
*/

-- Drop existing view
DROP VIEW IF EXISTS vw_leads_followup;

-- Recreate view with company_id
CREATE VIEW vw_leads_followup AS
SELECT 
  l.id,
  l.created_at AS data,
  l.nome,
  l.fonte,
  l.telefone,
  l.company_id,
  l.etapa_1,
  l.etapa_2,
  l.etapa_3,
  l.etapa_4,
  l.etapa_5,
  l.etapa_6,
  l.etapa_7,
  CASE
    WHEN q.data_qualificacao IS NULL THEN 'Lead ainda não qualificado'
    ELSE
      CASE
        WHEN q.data_qualificacao = l.etapa_1 THEN 'Lead qualificado na 1ª etapa'
        WHEN q.data_qualificacao = l.etapa_2 THEN 'Lead qualificado na 2ª etapa'
        WHEN q.data_qualificacao = l.etapa_3 THEN 'Lead qualificado na 3ª etapa'
        WHEN q.data_qualificacao = l.etapa_4 THEN 'Lead qualificado na 4ª etapa'
        WHEN q.data_qualificacao = l.etapa_5 THEN 'Lead qualificado na 5ª etapa'
        WHEN q.data_qualificacao = l.etapa_6 THEN 'Lead qualificado na 6ª etapa'
        WHEN q.data_qualificacao = l.etapa_7 THEN 'Lead qualificado na 7ª etapa'
        ELSE 'Lead qualificado em data desconhecida'
      END
  END AS observacao,
  q.data_qualificacao
FROM "follow-up" l
LEFT JOIN "logs-qualificacao" q ON q.id = l.id;