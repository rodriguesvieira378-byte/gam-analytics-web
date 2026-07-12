# GAM Analytics Web — V0.7.1

Versão web operacional do GAM Analytics, com notificações, registros do Discord, controle de acessos e identidade visual do efetivo.

## Entregue nesta versão

* login privado para um único administrador;
* modo demonstração local e modo conectado ao Supabase;
* cadastro e edição do efetivo;
* metas automáticas por cargo;
* lançamentos semanais com atualização do registro existente;
* Dashboard operacional;
* Supervisão Semanal simplificada;
* Inteligência Operacional;
* relatório para impressão/PDF;
* fechamento mensal com snapshot e hash de integridade;
* histórico de auditoria no banco;
* layout responsivo para computador e celular;
* dados atuais de junho de 2026 incluídos como base inicial.

## Tecnologias

* Next.js com App Router;
* React e TypeScript;
* Supabase Auth e PostgreSQL;
* Row Level Security para manter os dados privados;
* Vercel para publicação.

## Visualização rápida

Use `npm run dev` para testar a interface atual. O arquivo `preview.html` é apenas uma prévia histórica das primeiras versões e não representa a V0.7.1.

## Teste local imediato

1. Instale Node.js 20.9 ou superior.
2. Copie `.env.example` para `.env.local`.
3. Mantenha `NEXT\_PUBLIC\_DEMO\_MODE=true`.
4. Execute:

```bash
npm install
npm run dev
```

5. Abra `http://localhost:3000`.
6. Entre com `rodriguesvieira378@gmail.com` e qualquer senha não vazia.

No modo demonstração, os dados são salvos no navegador.

## Ativar o sistema online

### 1\. Criar o projeto no Supabase

* Crie um projeto Supabase.
* Em Authentication, crie o usuário `rodriguesvieira378@gmail.com`.
* No SQL Editor, execute `supabase/schema.sql`.
* Depois execute `supabase/seed.sql`.

### 2\. Configurar o ambiente

Crie `.env.local`:

```env
NEXT\_PUBLIC\_DEMO\_MODE=false
NEXT\_PUBLIC\_SUPABASE\_URL=URL\_DO\_PROJETO
NEXT\_PUBLIC\_SUPABASE\_PUBLISHABLE\_KEY=CHAVE\_PUBLICAVEL
NEXT\_PUBLIC\_OWNER\_EMAIL=rodriguesvieira378@gmail.com
```

### 3\. Publicar

* Envie o projeto para um repositório Git.
* Importe o repositório na Vercel.
* Cadastre as mesmas variáveis de ambiente na Vercel.
* Publique.

## Banco de dados

O arquivo `supabase/schema.sql` cria:

* `profiles`;
* `officers`;
* `weekly\_entries`;
* `monthly\_closures`;
* `audit\_logs`;
* políticas RLS;
* função de fechamento mensal;
* hash de integridade;
* gatilhos de auditoria.

## Dados importados

O arquivo `import/current-data.json` documenta os dados usados na migração inicial.

## Próxima etapa

* conectar o projeto a um Supabase real;
* testar autenticação online;
* publicar uma URL privada;
* importar novas semanas da planilha;
* validar o fechamento e relatório com dados reais.



## Atualização V0.7.1 — Identidade do Efetivo

* cards modernos para os integrantes;
* ficha completa com desempenho semanal;
* foto individual em JPG, PNG ou WEBP de até 5 MB;
* armazenamento privado no Supabase Storage;
* link opcional do Discord;
* envio, troca e remoção de foto restritos ao administrador.

Antes de publicar esta versão em um ambiente já existente, execute `supabase/update-v0.7.1-identity.sql` no SQL Editor do Supabase.
Base V0.7.2 reorganizada.

Base V0.7.2 reorganizada e pronta para deploy.

