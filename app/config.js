// Configuração pública do cliente web.
// A chave "publishable" foi feita para ficar no navegador: a proteção dos dados
// está nas políticas de RLS do banco (supabase/migrations), não no segredo desta chave.
// NUNCA coloque aqui a chave secreta (service_role / sb_secret_...).
window.FARM_ERP_CONFIG = Object.freeze({
  supabaseUrl: "https://cyhxffhkkknbyvryumwa.supabase.co",
  supabaseKey: "sb_publishable_EQ1fHQdridxHbukkDcJ3Lg_R-nCIBGO",
  permitirCadastro: false,      // tela "Criar conta"; mantenha false e desative o cadastro aberto no Supabase
  permitirCriarFazenda: true,   // o banco só permite ao primeiro usuário ou a administradores existentes
  inatividadeMinutos: 30        // encerra a sessão após este tempo sem uso
});
