/*
  # Adicionar RLS para a tabela follow-up

  1. Security
    - Habilitar RLS na tabela follow-up
    - Adicionar políticas para usuários autenticados visualizarem apenas dados da sua empresa
    - Adicionar políticas para inserção e atualização

  2. Políticas
    - SELECT: Usuários podem ver leads da sua empresa
    - INSERT: Usuários podem inserir leads na sua empresa
    - UPDATE: Usuários podem atualizar leads da sua empresa
    - DELETE: Usuários podem deletar leads da sua empresa
*/

-- Enable RLS
ALTER TABLE "follow-up" ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can view follow-up leads from their company
CREATE POLICY "Users can view own company follow-up leads"
  ON "follow-up"
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for INSERT: Users can insert follow-up leads for their company
CREATE POLICY "Users can insert follow-up leads for own company"
  ON "follow-up"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for UPDATE: Users can update follow-up leads from their company
CREATE POLICY "Users can update own company follow-up leads"
  ON "follow-up"
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for DELETE: Users can delete follow-up leads from their company
CREATE POLICY "Users can delete own company follow-up leads"
  ON "follow-up"
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );