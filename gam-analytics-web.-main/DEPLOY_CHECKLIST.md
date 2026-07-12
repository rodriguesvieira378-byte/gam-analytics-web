# Checklist para colocar o GAM Analytics no ar

## Supabase

- [ ] Criar o projeto.
- [ ] Criar o usuário `rodriguesvieira378@gmail.com`.
- [ ] Executar `supabase/schema.sql`.
- [ ] Executar `supabase/seed.sql`.
- [ ] Copiar a URL do projeto.
- [ ] Copiar a chave publicável (`sb_publishable_...`).

## Projeto

- [ ] Copiar `.env.example` para `.env.local`.
- [ ] Alterar `NEXT_PUBLIC_DEMO_MODE=false`.
- [ ] Inserir URL e chave do Supabase.
- [ ] Executar `npm install`.
- [ ] Executar `npm run build`.
- [ ] Testar login, cadastro, lançamento, relatório e fechamento.

## Vercel

- [ ] Criar repositório Git.
- [ ] Enviar o código.
- [ ] Importar o repositório na Vercel.
- [ ] Cadastrar as variáveis de ambiente.
- [ ] Publicar.
- [ ] Testar no celular e no computador.
