# Changelog

## 0.8.0 - Painel dinâmico e app de desktop
- Centro Operacional com números animados, entrada animada dos cards e status ao vivo.
- Novo gráfico "Evolução do mês" com as 5 semanas; clicar numa barra troca a semana.
- Comparativo da semana atual com a anterior (▲/▼ %).
- Ranking com barra de desempenho proporcional ao líder.
- "Saúde do sistema" agora mostra dados reais (modo demo, fila do Sync, último registro do bot).
- Animações respeitam a opção de movimento reduzido do sistema.
- App de desktop para Windows com Tauri e geração do .exe pelo GitHub Actions (ver docs/DESKTOP.md).
- Manifesto PWA completo para instalar o painel pelo navegador.
- Segurança: removido cliente Supabase com service role de dentro de components/.
- Adicionado supabase/check-rls.sql para verificar tabelas sem RLS.
- Versões das dependências fixadas (sem "latest").
- Removido ícone duplicado "icon (1).svg".

## 0.7.2 - Foundation
- Corrigido fluxo de criação e edição do efetivo.
- Corrigida mensagem falsa de atualização do SQL.
- Adicionada validação de matrícula duplicada.
- Atualizada identificação visual da versão.
- Preservada compatibilidade com Supabase e modo demonstração.
