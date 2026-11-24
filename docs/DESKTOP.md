# GAM Analytics — App de desktop

O GAM Analytics pode ser usado de duas formas no computador.

## 1. Instalar pelo navegador (PWA) — imediato

1. Abra o painel publicado no Chrome ou no Edge.
2. Clique no ícone de instalar na barra de endereço (ou menu ⋮ > "Instalar GAM Analytics").
3. O painel ganha ícone próprio na área de trabalho e abre em janela própria.

Funciona também no celular Android (menu ⋮ > "Adicionar à tela inicial").

## 2. Instalador `.exe` para Windows (Tauri)

O app de desktop é uma janela nativa leve (~5–10 MB) que abre o painel publicado.
Como ele carrega o site da Vercel, **toda atualização publicada na Vercel aparece
no app automaticamente**, sem reinstalar.

### Configuração (uma vez só)

1. No GitHub, abra **Settings > Secrets and variables > Actions > aba Variables**.
2. Clique em **New repository variable**:
   - Nome: `GAM_APP_URL`
   - Valor: o endereço do painel na Vercel (ex.: `https://gam-analytics.vercel.app`)

### Gerar o instalador

1. Vá em **Actions > "App de desktop (Windows)" > Run workflow**.
2. Aguarde a compilação (~10 min na primeira vez, mais rápido depois).
3. Em **Releases** aparece um rascunho `GAM Analytics Desktop vX.Y.Z` com o arquivo
   `..._x64-setup.exe`. Publique o rascunho e distribua o instalador.

Também dá para disparar criando uma tag: `git tag v0.8.0 && git push --tags`.

### Observações

- O login por e-mail e senha funciona normalmente dentro do app.
- Links de recuperação de senha enviados por e-mail abrem no navegador padrão.
- O Windows pode mostrar o aviso "SmartScreen" porque o instalador não é assinado
  digitalmente. Clique em "Mais informações > Executar assim mesmo".

### Estrutura

```
src-tauri/
  Cargo.toml        dependências do Rust (Tauri 2)
  build.rs
  src/main.rs       abre a janela do app
  tauri.conf.json   nome, tamanho da janela, ícones e URL do painel
.github/workflows/desktop.yml   compila o .exe no GitHub Actions
```

Os ícones são gerados automaticamente a partir de `public/gam-shield-1024.png`.
