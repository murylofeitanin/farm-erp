# Gestão Agro ERP

ERP gerencial para fazendas de café, pimenta-do-reino e grãos: contas a pagar e receber, vendas, colheitas, estoque de insumos (custo médio), patrimônio e depreciação, financiamentos (SAC/Price), orçamento da safra e relatórios — DRE gerencial, fluxo de caixa direto/indireto/projetado, balanço patrimonial, indicadores, produção e custos por hectare, estoque (kardex, curva ABC, validades) e orçado × realizado.

O projeto gera duas distribuições a partir do mesmo código:

| Distribuição | Onde roda | Dados e acesso |
|---|---|---|
| `app/` (principal) | Qualquer hospedagem estática; publicada no GitHub Pages pelo workflow | **Supabase**, com login individual, papéis, 2FA e auditoria |
| `dist/artefato.html` | Artefato do claude.ai | Banco do próprio artefato (sem Supabase — o artefato não pode acessar servidores externos) |

## Estrutura

```
src/                  módulos da aplicação (concatenados por build.sh)
  01-shell.html       layout, estilos e estrutura da página
  02-core.js          armazenamento, motor contábil (DRE, DFC, balanço, indicadores, custos)
  03-ui.js            infraestrutura de interface, formulários, tabelas, gráficos
  04-ops.js           operações e cadastros
  05-reports.js       relatórios
  06-painel-demo.js   painel, fazenda de exemplo e inicialização
  07-supabase.js      login, 2FA, escolha de fazenda, sincronização, usuários, auditoria
app/                  aplicação web pronta (index.html, app.js, config.js, vendor/)
supabase/migrations/  esquema do banco, RLS, funções e auditoria
build.sh              gera app/ e dist/artefato.html
```

Depois de alterar qualquer arquivo em `src/`, rode `./build.sh` e versione `app/` junto (o CI recusa o push se `app/` estiver desatualizado).

Para testar localmente: `./build.sh && cd app && python3 -m http.server 8080` e abra `http://localhost:8080` (adicione esse endereço às URLs de redirecionamento do Supabase).

## Modelo de segurança

**Princípio:** o navegador não é confiável. Tudo o que um usuário pode ler ou gravar é decidido pelo banco, por Row Level Security. A chave `publishable` em `app/config.js` é pública por natureza; sem uma sessão válida e um vínculo com a fazenda ela não acessa nada.

- **Login individual** (e-mail e senha) pelo Supabase Auth. Senha mínima de 12 caracteres com três tipos de caractere no cliente; configure o mesmo no servidor (abaixo).
- **Papéis por fazenda** (`membros`): `admin` gerencia usuários e dados, `editor` lança e altera dados, `leitor` só consulta. Um usuário pode ter papéis diferentes em fazendas diferentes.
- **RLS em todas as tabelas**; nenhum privilégio para o papel `anon`. Leitura exige vínculo com a fazenda; gravação exige `admin` ou `editor`; auditoria e convites só para `admin`.
- **2FA (TOTP)**: quem cadastrou um fator só acessa dados em sessão `aal2`; o administrador pode exigir 2FA de todos os usuários da fazenda (`fazendas.exigir_mfa`) — a regra é aplicada pelo banco, não pela tela.
- **Funções privilegiadas** (`SECURITY DEFINER`) com `search_path` vazio; auxiliares no esquema `privado`, não exposto pela API. As funções RPC públicas validam o papel internamente.
- **Criação de fazendas**: apenas o primeiro usuário (implantação) ou administradores existentes. Uma conta criada por terceiros não consegue abrir fazendas nem ver dados.
- **Convites**: o administrador adiciona um e-mail; se a conta existir o acesso é imediato, senão fica pendente por 14 dias e é aplicado quando a pessoa entra com e-mail confirmado.
- **Proteção do último administrador**: não é possível rebaixar ou remover o único admin.
- **Auditoria imutável**: gatilhos gravam cada inclusão, alteração e exclusão (com antes/depois), mudanças de acesso e de configuração. Ninguém grava ou altera a auditoria pela API.
- **Validação no banco**: coleções permitidas, formato de ids, documentos de no máximo 256 KB, proibição de mover registros entre fazendas.
- **Cliente**: Content-Security-Policy restrita (scripts só do próprio site, conexões só com o projeto Supabase), biblioteca do Supabase versionada no repositório (sem CDN), bloqueio de abertura dentro de outra página, saída da sessão após 30 min sem uso, "sair de todos os dispositivos", troca de senha exige senha atual e código 2FA, conteúdo sempre escapado antes de ir para a tela.

Biblioteca incluída: `@supabase/supabase-js` 2.118.0 (MIT), `app/vendor/supabase-js-2.118.0.js`, SHA-256 `ee3be8de192b97cb1d73d1e95d6b82bb1f6b658c0f97c4ef757fc331996ed3d3`.

## Configuração do Supabase (uma vez)

O esquema já está aplicado no projeto `farm-erp` (migrações em `supabase/migrations/`). No painel do Supabase, ajuste:

1. **Authentication › Sign In / Providers › Email**: desligue **Allow new users to sign up** (as contas passam a ser criadas só por convite). Mantenha **Confirm email** ligado.
2. **Authentication › Policies/Passwords**: tamanho mínimo **12** e exigência de letras maiúsculas, minúsculas, números e símbolos. Ative **Leaked password protection** (plano Pro).
3. **Authentication › Multi-Factor**: TOTP habilitado (padrão).
4. **Authentication › URL Configuration**: **Site URL** = endereço publicado (ex.: `https://murylofeitanin.github.io/farm-erp/`) e o mesmo em **Redirect URLs** (inclua `http://localhost:8080` só se for testar localmente).
5. **Authentication › SMTP**: configure um SMTP próprio para que convites e recuperação de senha cheguem a qualquer e-mail (o SMTP padrão tem limite baixo de envio).
6. **Primeiro acesso**: em **Authentication › Users › Add user / Invite user**, crie a sua conta. Entre no sistema e crie a fazenda; você será o administrador. Depois, convide os demais pela mesma tela do Supabase e libere cada um em **Usuários e acesso** no ERP.

## Publicação no GitHub Pages

Em **Settings › Pages › Build and deployment**, escolha **GitHub Actions**. Cada push em `main` roda `.github/workflows/pages.yml`, que confere o build, procura chaves secretas e publica a pasta `app/`.

GitHub Pages não permite definir cabeçalhos HTTP; a CSP vai em `<meta>` e a proteção contra abertura em outra página é feita por script. Para cabeçalhos completos (`frame-ancestors`, HSTS), publique `app/` em Cloudflare Pages ou Netlify com um arquivo de cabeçalhos.

## Limitações conhecidas

- Os dados da fazenda ficam em uma tabela de documentos JSON (`registros`), com o motor contábil rodando no navegador. Isso mantém um único código para o artefato e para a web; relatórios no servidor exigiriam tabelas relacionais.
- A sincronização entre usuários é por consulta a cada 20 s (sem Realtime, para não expor eventos de exclusão).
- A chave `publishable` e a URL do projeto são públicas por desenho; a segurança está nas políticas do banco.
