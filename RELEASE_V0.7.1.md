# GAM Analytics Web — Release V0.7.1

## O que mudou

- Tela **Efetivo GAM** redesenhada em cards.
- Foto individual com fallback para iniciais.
- Ficha completa do integrante em modal.
- Visão semanal de prisões, acompanhamentos, total, progresso, situação e orientação.
- Link opcional do Discord.
- Upload, troca e remoção de foto exclusivos para administrador.
- Fotos em bucket privado do Supabase, com URL temporária assinada.
- Limite de 5 MB e formatos JPG, PNG e WEBP.
- Modo demonstração compatível com fotos armazenadas no navegador.
- Correção do verificador de estrutura com `.env.example`.
- Ajuste de lint na página de recuperação de senha.

## Atualização do Supabase

Antes de publicar o código, abra o SQL Editor do Supabase e execute:

`supabase/update-v0.7.1-identity.sql`

O script adiciona os campos de identidade na tabela `officers`, cria o bucket privado `officer-photos` e configura as políticas de acesso.

## Ordem recomendada de publicação

1. Fazer backup do projeto atual.
2. Executar `supabase/update-v0.7.1-identity.sql`.
3. Enviar os arquivos desta versão para o GitHub.
4. Aguardar o deploy da Vercel.
5. Testar cadastro/edição de integrante.
6. Testar envio, troca e remoção de foto como administrador.
7. Testar visualização da ficha como supervisor e consulta.

## Validações realizadas

- `npm run lint`
- `npm run check`
- `npm run build`

Todas concluídas sem erros.
