# GAM Analytics Core

O diretório `lib/core` concentra as regras centrais de negócio do GAM Analytics.

Ele foi criado para separar a lógica operacional da interface, do banco de dados e das integrações externas.

Com isso, o sistema fica mais organizado, seguro e fácil de evoluir.

---

## Objetivo

O Core é responsável por:

- regras de metas;
- regras de elegibilidade do efetivo;
- validações;
- datas e períodos;
- semanas operacionais;
- ranking;
- estatísticas;
- formatação de dados;
- tipos compartilhados;
- configurações centrais.

O Core não deve depender de componentes React, páginas, Supabase ou Discord.

---

## Estrutura

```text
lib/
└── core/
    ├── config.ts
    ├── constants.ts
    ├── dates.ts
    ├── errors.ts
    ├── formatter.ts
    ├── goals.ts
    ├── helpers.ts
    ├── index.ts
    ├── officers.ts
    ├── ranking.ts
    ├── statistics.ts
    ├── types.ts
    ├── validation.ts
    ├── weeks.ts
    └── README.md