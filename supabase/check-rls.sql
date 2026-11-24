-- GAM Analytics — verificação de segurança (somente leitura)
-- Cole no SQL Editor do Supabase e execute.
-- Não altera nada no banco: apenas lista o que precisa de atenção.

-- 1) Tabelas públicas SEM Row Level Security.
--    Qualquer tabela que aparecer aqui pode ser lida/alterada por quem
--    tiver a chave pública do projeto. O resultado ideal é VAZIO.
select
  tablename as tabela_sem_rls
from pg_tables
where schemaname = 'public'
  and rowsecurity = false
order by tablename;

-- 2) Tabelas com RLS ativado, mas SEM nenhuma policy.
--    Ficam bloqueadas para o app (ninguém lê nem grava pelo cliente).
select
  t.tablename as tabela_rls_sem_policy
from pg_tables t
left join pg_policies p
  on p.schemaname = t.schemaname
 and p.tablename = t.tablename
where t.schemaname = 'public'
  and t.rowsecurity = true
group by t.tablename
having count(p.policyname) = 0
order by t.tablename;

-- 3) Visão geral das policies existentes.
select
  tablename as tabela,
  policyname as policy,
  cmd as operacao,
  roles as papeis
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
