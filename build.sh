#!/bin/sh
# Monta as duas distribuições a partir dos módulos em src/:
#   dist/artefato.html  -> página única para o artefato do claude.ai (dados no banco do artefato)
#   app/                -> aplicação web com login e dados no Supabase (publicada no GitHub Pages)
set -e
cd "$(dirname "$0")"
CORE="src/02-core.js src/03-ui.js src/04-ops.js src/05-reports.js src/06-painel-demo.js"
SUPA_JS="vendor/supabase-js-2.118.0.js"
mkdir -p dist

{ cat src/01-shell.html; echo '<script>'; cat $CORE src/99-inicia-artefato.js; echo '</script>'; } > dist/artefato.html

URL=$(sed -n 's/.*supabaseUrl: *"\([^"]*\)".*/\1/p' app/config.js)
[ -n "$URL" ] || { echo "supabaseUrl não encontrado em app/config.js" >&2; exit 1; }
cat $CORE src/07-supabase.js src/99-inicia-web.js > app/app.js
CSP="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src $URL; base-uri 'none'; form-action 'none'; object-src 'none'; manifest-src 'self'; upgrade-insecure-requests"
{
  printf '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
  printf '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  printf '<meta http-equiv="Content-Security-Policy" content="%s">\n' "$CSP"
  printf '<meta name="referrer" content="no-referrer">\n<meta name="robots" content="noindex,nofollow">\n'
  printf '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%%}[hidden]{display:none!important}</style>\n'
  printf '</head>\n<body>\n'
  cat src/01-shell.html
  printf '\n<script src="config.js"></script>\n<script src="%s"></script>\n<script src="app.js"></script>\n</body>\n</html>\n' "$SUPA_JS"
} > app/index.html
touch app/.nojekyll
echo "ok: dist/artefato.html e app/"
