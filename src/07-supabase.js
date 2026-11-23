/* ================= SUPABASE: autenticação, fazendas, dados e administração =================
   Ativo somente na versão web (app/). Toda a segurança é garantida no banco por RLS;
   o cliente apenas reflete o que o servidor permite. */
const SB = { c: null, user: null, faz: null, papel: "", aal: "aal1", fazendas: [], versao: null, timer: null, fluxo: null, membros: null, convites: null, aud: null, fatores: null, uiIniciada: false };
const PAPEIS = { admin: "Administrador", editor: "Editor", leitor: "Leitor" };
const sbCfg = () => window.FARM_ERP_CONFIG || {};
Object.assign(ICONS, {
  user: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/><path d="M17 11l2 2 4-4"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  log: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'
});

function sbErr(e) {
  const m = (e && (e.message || e.error_description || e.msg)) || String(e || "");
  if (/Invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/Email not confirmed/i.test(m)) return "Confirme seu e-mail pelo link enviado antes de entrar.";
  if (/rate limit|too many|429/i.test(m)) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  if (/row-level security|permission denied|42501|Sem permiss/i.test(m)) return "Sem permissão para esta operação. Verifique seu papel na fazenda ou a confirmação em duas etapas.";
  if (/Invalid TOTP|invalid.*code|expired/i.test(m)) return "Código inválido ou expirado. Confira o horário do celular e tente de novo.";
  if (/weak|Password should|pwned|leaked/i.test(m)) return "Senha recusada pelo servidor: use uma senha longa e única, que não tenha vazado em outros sites.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Sem conexão com o servidor. Verifique a internet.";
  if (/JWT expired|session/i.test(m)) return "Sua sessão expirou. Entre novamente.";
  return m || "Não foi possível concluir. Tente de novo.";
}
function senhaFraca(s) {
  if (!s || s.length < 12) return "A senha precisa ter pelo menos 12 caracteres.";
  const cl = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(s)).length;
  if (cl < 3) return "Misture pelo menos três tipos: minúsculas, maiúsculas, números e símbolos.";
  return "";
}

/* ---------- telas de acesso ---------- */
function authShow(inner, { largo } = {}) {
  $("#app").hidden = true; closeModal();
  let a = $("#auth"); if (!a) { a = document.createElement("div"); a.id = "auth"; a.className = "auth"; document.body.appendChild(a); }
  a.hidden = false;
  a.innerHTML = `<div class="auth-card panel ${largo ? "largo" : ""}"><div class="brand" style="border:0;padding:0 0 6px"><div class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9"/><path d="M12 13c-4 0-6-3-6-7 4 0 6 3 6 7z"/><path d="M12 11c0-4 2-7 6-7 0 4-2 7-6 7z"/><path d="M5 21h14"/></svg></div><div><b>Gestão Agro ERP</b><small>Acesso seguro</small></div></div>${inner}<div class="err" id="authErr" role="alert"></div></div>`;
  const f = $("form", a); if (f) { const i = $("input", f); if (i) setTimeout(() => i.focus(), 30); }
  return a;
}
function authHide() { const a = $("#auth"); if (a) { a.hidden = true; a.innerHTML = ""; } $("#app").hidden = false; }
const authErr = m => { const e = $("#authErr"); if (e) e.textContent = m || ""; };
const authMsg = m => { const e = $("#authErr"); if (e) { e.textContent = m; e.className = "note"; } };
function authForm(sel, fn) {
  const f = $(sel); if (!f) return;
  f.addEventListener("submit", async ev => {
    ev.preventDefault(); authErr(""); const b = $("button[type=submit]", f); if (b) b.disabled = true;
    try { await fn(Object.fromEntries(new FormData(f).entries())); } catch (e) { console.warn(e); authErr(sbErr(e)); }
    finally { if (b && document.body.contains(b)) b.disabled = false; }
  });
}
function telaLogin(msg) {
  authShow(`<h2 style="font-size:20px">Entrar</h2><p class="note" style="margin:0">Use o e-mail e a senha cadastrados para você.</p>
    <form id="fLogin" class="auth-form"><label for="lEmail">E-mail</label><input class="inp" id="lEmail" name="email" type="email" autocomplete="username" required maxlength="254">
    <label for="lSenha">Senha</label><input class="inp" id="lSenha" name="senha" type="password" autocomplete="current-password" required maxlength="128">
    <button class="btn pri" type="submit">Entrar</button></form>
    <div class="toolbar"><button class="btn ghost sm" id="bEsqueci" type="button">Esqueci minha senha</button>${sbCfg().permitirCadastro ? `<button class="btn ghost sm" id="bCadastro" type="button">Criar conta</button>` : ""}</div>`);
  if (msg) authMsg(msg);
  authForm("#fLogin", async v => {
    const { error } = await SB.c.auth.signInWithPassword({ email: v.email.trim(), password: v.senha });
    if (error) throw error; await posLogin();
  });
  $("#bEsqueci").onclick = telaEsqueci; const bc = $("#bCadastro"); if (bc) bc.onclick = telaCadastro;
}
function telaEsqueci() {
  authShow(`<h2 style="font-size:20px">Recuperar senha</h2><p class="note" style="margin:0">Enviaremos um link para definir uma nova senha.</p>
    <form id="fEsq" class="auth-form"><label for="eEmail">E-mail</label><input class="inp" id="eEmail" name="email" type="email" autocomplete="username" required maxlength="254"><button class="btn pri" type="submit">Enviar link</button></form>
    <div class="toolbar"><button class="btn ghost sm" id="bVoltar" type="button">Voltar</button></div>`);
  authForm("#fEsq", async v => {
    const { error } = await SB.c.auth.resetPasswordForEmail(v.email.trim(), { redirectTo: location.origin + location.pathname });
    if (error && !/rate/i.test(error.message)) throw error;
    authMsg("Se o e-mail estiver cadastrado, você receberá o link em instantes. Verifique também o spam.");
  });
  $("#bVoltar").onclick = () => telaLogin();
}
function telaCadastro() {
  authShow(`<h2 style="font-size:20px">Criar conta</h2><p class="note" style="margin:0">Depois de confirmar o e-mail, peça ao administrador da fazenda para liberar seu acesso.</p>
    <form id="fCad" class="auth-form"><label for="cEmail">E-mail</label><input class="inp" id="cEmail" name="email" type="email" autocomplete="username" required maxlength="254">
    <label for="cSenha">Senha (mín. 12 caracteres)</label><input class="inp" id="cSenha" name="senha" type="password" autocomplete="new-password" required maxlength="128">
    <label for="cSenha2">Repita a senha</label><input class="inp" id="cSenha2" name="senha2" type="password" autocomplete="new-password" required maxlength="128">
    <button class="btn pri" type="submit">Criar conta</button></form><div class="toolbar"><button class="btn ghost sm" id="bVoltar" type="button">Voltar</button></div>`);
  authForm("#fCad", async v => {
    const fr = senhaFraca(v.senha); if (fr) throw new Error(fr); if (v.senha !== v.senha2) throw new Error("As senhas não conferem.");
    const { error } = await SB.c.auth.signUp({ email: v.email.trim(), password: v.senha, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) throw error; authMsg("Conta criada. Confirme pelo link enviado ao seu e-mail.");
  });
  $("#bVoltar").onclick = () => telaLogin();
}
function telaDefinirSenha() {
  authShow(`<h2 style="font-size:20px">${SB.fluxo === "invite" ? "Bem-vindo! Defina sua senha" : "Defina uma nova senha"}</h2><p class="note" style="margin:0">${esc(SB.user ? SB.user.email : "")}</p>
    <form id="fNova" class="auth-form"><label for="nSenha">Nova senha (mín. 12 caracteres)</label><input class="inp" id="nSenha" name="senha" type="password" autocomplete="new-password" required maxlength="128">
    <label for="nSenha2">Repita a senha</label><input class="inp" id="nSenha2" name="senha2" type="password" autocomplete="new-password" required maxlength="128"><button class="btn pri" type="submit">Salvar senha</button></form>`);
  authForm("#fNova", async v => {
    const fr = senhaFraca(v.senha); if (fr) throw new Error(fr); if (v.senha !== v.senha2) throw new Error("As senhas não conferem.");
    const { error } = await SB.c.auth.updateUser({ password: v.senha }); if (error) throw error;
    SB.fluxo = null; await posLogin();
  });
}
async function fatoresTotp() { const { data, error } = await SB.c.auth.mfa.listFactors(); if (error) throw error; return (data && data.totp || []).filter(f => f.status === "verified"); }
async function telaMfa() {
  const fs = await fatoresTotp(); if (!fs.length) return telaCadastrarMfa(true);
  authShow(`<h2 style="font-size:20px">Confirmação em duas etapas</h2><p class="note" style="margin:0">Digite o código de 6 dígitos do seu aplicativo autenticador.</p>
    <form id="fMfa" class="auth-form"><label for="mCod">Código</label><input class="inp" id="mCod" name="codigo" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required><button class="btn pri" type="submit">Confirmar</button></form>
    <div class="toolbar"><button class="btn ghost sm" id="bSairM" type="button">Sair</button></div>`);
  authForm("#fMfa", async v => { const { error } = await SB.c.auth.mfa.challengeAndVerify({ factorId: fs[0].id, code: v.codigo.trim() }); if (error) throw error; await posLogin(); });
  $("#bSairM").onclick = () => sbSair();
}
async function telaCadastrarMfa(obrigatorio) {
  // remove fatores não verificados antigos para não acumular
  try { const { data } = await SB.c.auth.mfa.listFactors(); for (const f of (data && data.all || [])) if (f.status !== "verified") await SB.c.auth.mfa.unenroll({ factorId: f.id }); } catch (e) { }
  const { data, error } = await SB.c.auth.mfa.enroll({ factorType: "totp", friendlyName: "Autenticador " + new Date().toISOString().slice(0, 16) });
  if (error) { authShow(`<p>${esc(sbErr(error))}</p>`); return; }
  const qr = data.totp && data.totp.qr_code && /^data:image\/svg\+xml/.test(data.totp.qr_code) ? data.totp.qr_code : "";
  authShow(`<h2 style="font-size:20px">Ative a confirmação em duas etapas</h2><p class="note" style="margin:0">${obrigatorio ? "Esta fazenda exige 2FA. " : ""}Escaneie o QR code com Google Authenticator, Microsoft Authenticator, Authy ou 1Password e digite o código gerado.</p>
    ${qr ? `<img src="${esc(qr)}" alt="QR code para o aplicativo autenticador" width="180" height="180" style="background:#fff;border-radius:8px;padding:8px;align-self:center">` : ""}
    <div class="hint">Chave manual: <span class="mono" style="word-break:break-all">${esc(data.totp.secret)}</span></div>
    <form id="fEnr" class="auth-form"><label for="eCod">Código de 6 dígitos</label><input class="inp" id="eCod" name="codigo" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required><button class="btn pri" type="submit">Ativar</button></form>
    <div class="toolbar"><button class="btn ghost sm" id="bCancEnr" type="button">${obrigatorio ? "Sair" : "Cancelar"}</button></div>`);
  authForm("#fEnr", async v => { const { error: e2 } = await SB.c.auth.mfa.challengeAndVerify({ factorId: data.id, code: v.codigo.trim() }); if (e2) throw e2; toast("Confirmação em duas etapas ativada"); await posLogin(); });
  $("#bCancEnr").onclick = async () => { try { await SB.c.auth.mfa.unenroll({ factorId: data.id }); } catch (e) { } if (obrigatorio) sbSair(); else posLogin(); };
}
function telaSemFazenda() {
  const pode = sbCfg().permitirCriarFazenda !== false;
  authShow(`<h2 style="font-size:20px">Nenhuma fazenda liberada</h2><p class="note" style="margin:0">Você entrou como <b>${esc(SB.user.email)}</b>, mas ainda não tem acesso a nenhuma fazenda. Peça ao administrador para adicionar este e-mail em Usuários e acesso.</p>
    ${pode ? `<form id="fNovaFaz" class="auth-form"><label for="nfNome">Ou crie a primeira fazenda (somente na implantação ou por administradores)</label><input class="inp" id="nfNome" name="nome" required minlength="2" maxlength="120" placeholder="Nome da fazenda"><button class="btn pri" type="submit">Criar fazenda</button></form>` : ""}
    <div class="toolbar"><button class="btn ghost sm" id="bRec" type="button">Verificar novamente</button><button class="btn ghost sm" id="bSairS" type="button">Sair</button></div>`);
  authForm("#fNovaFaz", async v => { const { error } = await SB.c.rpc("criar_fazenda", { p_nome: v.nome.trim() }); if (error) throw error; await posLogin(); });
  $("#bRec").onclick = () => posLogin(); $("#bSairS").onclick = () => sbSair();
}
function telaEscolherFazenda() {
  authShow(`<h2 style="font-size:20px">Escolha a fazenda</h2><div class="alerts">${SB.fazendas.map(f => `<button class="btn" style="justify-content:space-between;width:100%" data-faz="${esc(f.id)}"><span>${esc(f.nome)}</span><span class="pill plain">${esc(PAPEIS[f.papel] || f.papel)}</span></button>`).join("")}</div>
    <div class="toolbar"><button class="btn ghost sm" id="bSairE" type="button">Sair</button></div>`);
  $$("[data-faz]").forEach(b => b.onclick = () => entrarFazenda(SB.fazendas.find(f => f.id === b.dataset.faz)));
  $("#bSairE").onclick = () => sbSair();
}

/* ---------- fluxo principal ---------- */
async function bootSupabase() {
  if (window.top !== window.self) { document.body.innerHTML = "<p style='padding:24px'>Por segurança, este sistema não pode ser aberto dentro de outra página.</p>"; return; }
  const cf = sbCfg();
  if (!cf.supabaseUrl || !cf.supabaseKey || !window.supabase) { document.body.innerHTML = "<p style='padding:24px'>Configuração do Supabase ausente (config.js).</p>"; return; }
  const h = location.hash; if (/type=(invite|recovery)/.test(h)) SB.fluxo = h.includes("type=invite") ? "invite" : "recovery";
  SB.c = window.supabase.createClient(cf.supabaseUrl, cf.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit", storageKey: "farm-erp-auth" } });
  SB.c.auth.onAuthStateChange((ev) => {
    if (ev === "PASSWORD_RECOVERY") { SB.fluxo = SB.fluxo || "recovery"; setTimeout(() => posLogin(), 0); }
    if (ev === "SIGNED_OUT" && SB.faz) { SB.faz = null; location.replace(location.pathname); }
  });
  const { data: { session } } = await SB.c.auth.getSession();
  if (/access_token|error_description|type=/.test(location.hash)) history.replaceState(null, "", location.pathname);
  let msg = ""; try { msg = sessionStorage.getItem("farmErp.msg") || ""; sessionStorage.removeItem("farmErp.msg"); } catch (e) { }
  if (!session) return telaLogin(msg);
  await posLogin();
}
async function posLogin() {
  try {
    const { data: { user }, error } = await SB.c.auth.getUser();
    if (error || !user) return telaLogin();
    SB.user = user;
    if (SB.fluxo) return telaDefinirSenha();
    const { data: aal } = await SB.c.auth.mfa.getAuthenticatorAssuranceLevel();
    SB.aal = (aal && aal.currentLevel) || "aal1";
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") return telaMfa();
    await SB.c.rpc("aceitar_convites");
    const { data: fz, error: e2 } = await SB.c.rpc("minhas_fazendas"); if (e2) throw e2;
    SB.fazendas = fz || [];
    if (!SB.fazendas.length) return telaSemFazenda();
    let last = null; try { last = localStorage.getItem("farmErp.fazenda"); } catch (e) { }
    const f = SB.fazendas.find(x => x.id === last) || (SB.fazendas.length === 1 ? SB.fazendas[0] : null);
    if (!f) return telaEscolherFazenda();
    return entrarFazenda(f);
  } catch (e) { console.warn(e); telaLogin(); authErr(sbErr(e)); }
}
async function entrarFazenda(f) {
  if (f.exigir_mfa && SB.aal !== "aal2") { const fs = await fatoresTotp(); return fs.length ? telaMfa() : telaCadastrarMfa(true); }
  SB.faz = f; SB.papel = f.papel; SB.membros = SB.convites = SB.aud = SB.fatores = null;
  try { localStorage.setItem("farmErp.fazenda", f.id); } catch (e) { }
  authShow(`<p>Carregando os dados de <b>${esc(f.nome)}</b>…</p><div class="progress"><div style="width:40%"></div></div>`);
  configurarStore();
  try { await sbCarregarTudo(); } catch (e) { authShow(`<p>${esc(sbErr(e))}</p><div class="toolbar"><button class="btn" id="bTent">Tentar de novo</button><button class="btn ghost" id="bSairC">Sair</button></div>`); $("#bTent").onclick = () => entrarFazenda(f); $("#bSairC").onclick = () => sbSair(); return; }
  Store.ready = true; navAdmin(); authHide();
  P.from = ""; P.to = "";
  if (!SB.uiIniciada) { SB.uiIniciada = true; bootUI(); } else { if (S.cfg.get("main")) initPeriod(); render(false); }
  iniciarSync(); iniciarInatividade();
}
async function sbSair(msg, global) {
  clearInterval(SB.timer);
  try { await SB.c.auth.signOut({ scope: global ? "global" : "local" }); } catch (e) { }
  COLS.forEach(c => S[c] = new Map());
  try { if (msg) sessionStorage.setItem("farmErp.msg", msg); localStorage.removeItem("farmErp.fazenda"); } catch (e) { }
  location.replace(location.pathname);
}
function iniciarInatividade() {
  if (SB.inat) return; SB.inat = true;
  const lim = Math.max(5, num(sbCfg().inatividadeMinutos) || 30) * 60000; let ult = Date.now();
  ["mousemove", "keydown", "click", "touchstart", "scroll"].forEach(ev => addEventListener(ev, () => { ult = Date.now(); }, { passive: true }));
  setInterval(() => { if (SB.user && Date.now() - ult > lim) sbSair("Sessão encerrada após " + Math.round(lim / 60000) + " minutos sem uso."); }, 30000);
}

/* ---------- camada de dados ---------- */
function configurarStore() {
  Store.mode = "supabase"; Store.canWrite = SB.papel !== "leitor"; Store.isAdmin = SB.papel === "admin";
  Store.saveLocal = () => { };
  Store.footHTML = () => `<div style="display:flex;flex-direction:column;gap:3px"><b style="color:var(--fg-2);word-break:break-all">${esc(SB.user.email)}</b><span>${esc(SB.faz.nome)} · ${esc(PAPEIS[SB.papel] || SB.papel)}${SB.aal === "aal2" ? " · 2FA" : ""}</span>
    <div class="toolbar" style="margin-top:6px">${SB.fazendas.length > 1 ? `<button class="btn sm" data-act="sb-trocar">Trocar fazenda</button>` : ""}<button class="btn sm" data-act="sb-sair">Sair</button></div></div>`;
  const row = (col, o) => ({ fazenda_id: SB.faz.id, colecao: col, id: o.id, dados: Store.clean(o) });
  Store.put = async function (col, obj) {
    if (!obj.id) obj.id = uid(); S[col].set(obj.id, { ...obj }); this.bump();
    const { error } = await SB.c.from("registros").upsert(row(col, obj)); if (error) await sbFalha(error); return obj;
  };
  Store.del = async function (col, id) {
    S[col].delete(id); this.bump();
    const { error } = await SB.c.from("registros").delete().match({ fazenda_id: SB.faz.id, colecao: col, id }); if (error) await sbFalha(error);
  };
  Store.bulk = async function (ops, onProgress) {
    ops.forEach(o => { if (o.op === "put") { if (!o.obj.id) o.obj.id = uid(); S[o.col].set(o.obj.id, { ...o.obj }); } else S[o.col].delete(o.id); });
    this.bump();
    const puts = new Map(); const dels = new Map();
    ops.forEach(o => { if (o.op === "put") { puts.set(o.col + "|" + o.obj.id, row(o.col, o.obj)); } else { puts.delete(o.col + "|" + o.id); if (!dels.has(o.col)) dels.set(o.col, new Set()); dels.get(o.col).add(o.id); } });
    ops.filter(o => o.op === "put").forEach(o => { const d = dels.get(o.col); if (d) d.delete(o.obj.id); });
    const lotes = []; const ps = [...puts.values()]; for (let i = 0; i < ps.length; i += 400) lotes.push({ t: "u", v: ps.slice(i, i + 400) });
    dels.forEach((ids, col) => { const a = [...ids]; for (let i = 0; i < a.length; i += 150) lotes.push({ t: "d", col, v: a.slice(i, i + 150) }); });
    let n = 0;
    for (const l of lotes) {
      const { error } = l.t === "u" ? await SB.c.from("registros").upsert(l.v) : await SB.c.from("registros").delete().eq("fazenda_id", SB.faz.id).eq("colecao", l.col).in("id", l.v);
      if (error) await sbFalha(error);
      n++; onProgress && onProgress(n / lotes.length);
    }
    if (!lotes.length && onProgress) onProgress(1);
  };
}
async function sbFalha(error) {
  toast(sbErr(error), true);
  try { await sbCarregarTudo(); } catch (e) { }
  throw new Error(sbErr(error));
}
async function sbCarregarTudo() {
  const rows = []; const pg = 1000;
  for (let from = 0; ; from += pg) {
    const { data, error } = await SB.c.from("registros").select("colecao,id,dados,atualizado_em").eq("fazenda_id", SB.faz.id).order("colecao").order("id").range(from, from + pg - 1);
    if (error) throw error; rows.push(...data); if (data.length < pg) break;
  }
  COLS.forEach(c => S[c] = new Map()); let v = null;
  rows.forEach(r => { if (S[r.colecao]) S[r.colecao].set(r.id, { ...r.dados, id: r.id }); if (!v || r.atualizado_em > v) v = r.atualizado_em; });
  SB.versao = v; Store.bump();
}
const totalLocal = () => COLS.reduce((n, c) => n + S[c].size, 0);
function iniciarSync() {
  clearInterval(SB.timer); SB.timer = setInterval(sbSync, 20000);
  if (!SB.visOn) { SB.visOn = true; document.addEventListener("visibilitychange", () => { if (!document.hidden) sbSync(); }); }
}
async function sbSync() {
  if (document.hidden || !SB.faz || SB.sinc || VIEW.dirty) return; SB.sinc = true;
  try {
    const { data, error } = await SB.c.rpc("estado_fazenda", { p_fazenda: SB.faz.id }); if (error) throw error;
    const st = data && data[0]; if (!st) return;
    if (st.versao === SB.versao && +st.total === totalLocal()) return;
    if (SB.versao && st.versao && st.versao > SB.versao) {
      const { data: rs, error: e2 } = await SB.c.from("registros").select("colecao,id,dados,atualizado_em").eq("fazenda_id", SB.faz.id).gt("atualizado_em", SB.versao).limit(5000);
      if (e2) throw e2; rs.forEach(r => { if (S[r.colecao]) S[r.colecao].set(r.id, { ...r.dados, id: r.id }); });
      SB.versao = st.versao;
    }
    if (+st.total !== totalLocal()) await sbCarregarTudo(); else Store.bump();
  } catch (e) { console.warn("sincronização", e); }
  finally { SB.sinc = false; }
}

/* ---------- navegação de administração ---------- */
function navAdmin() {
  const i = NAV.findIndex(s => s.g === "Administração"); if (i >= 0) NAV.splice(i, 1);
  const items = []; if (Store.isAdmin) items.push(["usuarios", "Usuários e acesso", "user"], ["auditoria", "Auditoria", "log"]);
  items.push(["seguranca", "Minha conta e segurança", "lock"]);
  NAV.push({ g: "Administração", items });
}
ACTIONS["sb-sair"] = () => sbSair();
ACTIONS["sb-trocar"] = () => { try { localStorage.removeItem("farmErp.fazenda"); } catch (e) { } clearInterval(SB.timer); telaEscolherFazenda(); };

/* ---------- Usuários e acesso ---------- */
async function carregarMembros() {
  const [m, c] = await Promise.all([SB.c.rpc("listar_membros", { p_fazenda: SB.faz.id }), SB.c.from("convites").select("email,papel,criado_em,expira_em").eq("fazenda_id", SB.faz.id).order("criado_em", { ascending: false })]);
  if (m.error) throw m.error; SB.membros = m.data || []; SB.convites = c.error ? [] : (c.data || []);
}
route("usuarios", "Usuários e acesso", () => {
  if (Store.mode !== "supabase") return "";
  if (!Store.isAdmin) return `<div class="empty"><b>Somente administradores gerenciam usuários.</b></div>`;
  if (!SB.membros) return `<div class="empty"><b>Carregando usuários…</b></div>`;
  const ms = SB.membros, eu = SB.user.id;
  const optP = v => opt(Object.entries(PAPEIS), v);
  return `<div class="kpis">${kpi("Usuários", String(ms.length), "")}${kpi("Administradores", String(ms.filter(m => m.papel === "admin").length), "")}${kpi("Com 2FA ativo", `${ms.filter(m => m.mfa).length} de ${ms.length}`, SB.faz.exigir_mfa ? pill("2FA obrigatório", "good") : pill("2FA opcional", "warn"))}${kpi("Convites pendentes", String(SB.convites.length), "Expiram em 14 dias")}</div>
  ${panel("Adicionar usuário", `<form class="toolbar" id="fAddMembro"><input class="inp grow" id="amEmail" name="email" type="email" required maxlength="254" placeholder="email@exemplo.com" aria-label="E-mail"><select class="inp" id="amPapel" name="papel" aria-label="Papel">${optP("editor")}</select><button class="btn pri" type="submit">${ico("plus")} Adicionar</button></form>
    <p class="note" style="margin:10px 0 0">Se a pessoa já tem conta, o acesso é liberado na hora. Se não tem, o convite fica pendente por 14 dias e é aplicado quando ela entrar pela primeira vez. Com o cadastro aberto desativado, crie a conta em Supabase › Authentication › Users › Invite user.<br><b>Administrador</b> gerencia usuários e dados · <b>Editor</b> lança e altera dados · <b>Leitor</b> só consulta.</p>`)}
  ${panel("Usuários com acesso", table([
    { h: "Usuário", f: m => `<b>${esc(m.email || "—")}</b>${m.user_id === eu ? " " + pill("Você", "info") : ""}` },
    { h: "Papel", f: m => m.user_id === eu ? esc(PAPEIS[m.papel]) : `<select class="inp sm" data-act="sb-papel" data-id="${esc(m.user_id)}" aria-label="Papel">${optP(m.papel)}</select>` },
    { h: "2FA", f: m => m.mfa ? pill("Ativo", "good") : pill("Inativo", SB.faz.exigir_mfa ? "bad" : "warn") },
    { h: "Desde", f: m => fmtD(String(m.desde || "").slice(0, 10)) }, { h: "Último acesso", f: m => m.ultimo_acesso ? fmtD(m.ultimo_acesso.slice(0, 10)) + " " + m.ultimo_acesso.slice(11, 16) : "—" },
    { h: "", cls: "acts", f: m => m.user_id === eu ? "" : `<button class="btn sm danger" data-act="sb-remover" data-id="${esc(m.user_id)}">Remover</button>` }
  ], ms), { flush: true })}
  ${SB.convites.length ? panel("Convites pendentes", table([{ h: "E-mail", f: c => `<b>${esc(c.email)}</b>` }, { h: "Papel", f: c => esc(PAPEIS[c.papel]) }, { h: "Expira em", f: c => fmtD(c.expira_em.slice(0, 10)) }, { h: "", cls: "acts", f: c => `<button class="btn sm" data-act="sb-cancel-conv" data-id="${esc(c.email)}">Cancelar</button>` }], SB.convites), { flush: true }) : ""}
  ${panel("Política de segurança da fazenda", `<label class="chk"><input type="checkbox" id="chkMfa" data-act="sb-exigir-mfa" ${SB.faz.exigir_mfa ? "checked" : ""}> Exigir confirmação em duas etapas (2FA) de todos os usuários desta fazenda</label>
    <p class="note" style="margin:6px 0 0">Com a opção ligada, o banco recusa leitura e gravação de qualquer sessão sem 2FA. Ative o seu 2FA antes, em Minha conta e segurança.${SB.aal !== "aal2" ? " <b>Sua sessão atual não está em 2FA.</b>" : ""}</p>`)}`;
}, { after: () => { if (Store.mode !== "supabase" || !Store.isAdmin) return; if (!SB.membros) carregarMembros().then(() => render()).catch(e => toast(sbErr(e), true)); const f = $("#fAddMembro"); if (f) f.addEventListener("submit", async ev => { ev.preventDefault(); const v = Object.fromEntries(new FormData(f).entries()); const { data, error } = await SB.c.rpc("adicionar_membro", { p_fazenda: SB.faz.id, p_email: v.email.trim(), p_papel: v.papel }); if (error) { toast(sbErr(error), true); return; } toast(data === "membro" ? "Acesso liberado" : "Convite registrado; será aplicado no primeiro acesso"); SB.membros = null; render(); }); } });
ACTIONS["sb-papel"] = async (id, el) => { const { error } = await SB.c.rpc("alterar_papel", { p_fazenda: SB.faz.id, p_user: id, p_papel: el.value }); if (error) toast(sbErr(error), true); else toast("Papel atualizado"); SB.membros = null; render(); };
ACTIONS["sb-remover"] = async id => { const m = (SB.membros || []).find(x => x.user_id === id); const ok = await confirmBox(`Remover o acesso de <b>${esc(m && m.email || "este usuário")}</b> a esta fazenda?`, "Remover acesso"); if (!ok) return; const { error } = await SB.c.rpc("remover_membro", { p_fazenda: SB.faz.id, p_user: id }); if (error) toast(sbErr(error), true); else toast("Acesso removido"); SB.membros = null; render(); };
ACTIONS["sb-cancel-conv"] = async email => { const { error } = await SB.c.rpc("cancelar_convite", { p_fazenda: SB.faz.id, p_email: email }); if (error) toast(sbErr(error), true); SB.membros = null; render(); };
ACTIONS["sb-exigir-mfa"] = async (_, el) => {
  const v = el.checked;
  if (v && SB.aal !== "aal2") { el.checked = false; toast("Ative e confirme o seu 2FA antes de exigir dos demais.", true); return; }
  const { error } = await SB.c.from("fazendas").update({ exigir_mfa: v }).eq("id", SB.faz.id);
  if (error) { el.checked = !v; toast(sbErr(error), true); return; }
  SB.faz.exigir_mfa = v; const f = SB.fazendas.find(x => x.id === SB.faz.id); if (f) f.exigir_mfa = v; toast(v ? "2FA agora é obrigatório nesta fazenda" : "2FA deixou de ser obrigatório"); SB.membros = null; render();
};

/* ---------- Auditoria ---------- */
const AF = { tabela: "", op: "" };
async function carregarAuditoria() {
  let q = SB.c.from("auditoria").select("id,tabela,colecao,registro_id,operacao,usuario,em,antes,depois").eq("fazenda_id", SB.faz.id).order("em", { ascending: false }).limit(300);
  if (AF.tabela) q = q.eq("colecao", AF.tabela); if (AF.op) q = q.eq("operacao", AF.op);
  const { data, error } = await q; if (error) throw error; SB.aud = data || [];
  if (!SB.membros) { try { await carregarMembros(); } catch (e) { SB.membros = []; } }
}
route("auditoria", "Auditoria", () => {
  if (Store.mode !== "supabase") return "";
  if (!Store.isAdmin) return `<div class="empty"><b>Somente administradores consultam a auditoria.</b></div>`;
  if (!SB.aud) return `<div class="empty"><b>Carregando trilha de auditoria…</b></div>`;
  const quem = id => { const m = (SB.membros || []).find(x => x.user_id === id); return m && m.email ? m.email : (id ? "usuário removido" : "sistema"); };
  const resumo = a => { const d = a.depois || a.antes || {}; return d.descricao || d.nome || d.fazenda || (a.tabela === "membros" ? "Acesso de " + quem(d.user_id) + (d.papel ? " (" + (PAPEIS[d.papel] || d.papel) + ")" : "") : a.tabela === "fazendas" ? "Configuração da fazenda" : a.registro_id || ""); };
  const mud = a => { if (a.operacao !== "alterar" || !a.antes || !a.depois) return ""; const ks = [...new Set([...Object.keys(a.antes), ...Object.keys(a.depois)])].filter(k => JSON.stringify(a.antes[k]) !== JSON.stringify(a.depois[k])); return ks.slice(0, 6).map(k => `${k}: ${String(a.antes[k] ?? "—").slice(0, 30)} → ${String(a.depois[k] ?? "—").slice(0, 30)}`).join(" · "); };
  const opP = o => ({ incluir: pill("Inclusão", "good"), insert: pill("Inclusão", "good"), alterar: pill("Alteração", "warn"), update: pill("Alteração", "warn"), excluir: pill("Exclusão", "bad"), delete: pill("Exclusão", "bad") }[o] || pill(o));
  return panel("Trilha de auditoria", table([
    { h: "Data e hora", f: a => fmtD(a.em.slice(0, 10)) + " " + a.em.slice(11, 19) }, { h: "Usuário", f: a => esc(quem(a.usuario)) }, { h: "Operação", f: a => opP(a.operacao) },
    { h: "Onde", f: a => esc(a.colecao || a.tabela) }, { h: "Registro", f: a => `<b>${esc(resumo(a))}</b>${mud(a) ? `<div class="note">${esc(mud(a))}</div>` : ""}`, cls: "wrap" }
  ], SB.aud, { id: "auditoria", empty: "Nenhum evento com esses filtros." }), {
    sub: "Últimos 300 eventos. Gravada pelo banco a cada inclusão, alteração ou exclusão; ninguém consegue editá-la pelo sistema.", flush: true,
    tools: `<div class="toolbar"><select class="inp sm" data-act="aud-tab" aria-label="Coleção">${opt(COLS.map(c => [c, c]), AF.tabela, "Todas as coleções")}</select><select class="inp sm" data-act="aud-op" aria-label="Operação">${opt([["incluir", "Inclusões"], ["alterar", "Alterações"], ["excluir", "Exclusões"]], AF.op, "Todas as operações")}</select><button class="btn sm" data-act="aud-recarregar">Atualizar</button>${csvBtn("auditoria", "auditoria")}</div>`
  });
}, { after: () => { if (Store.mode === "supabase" && Store.isAdmin && !SB.aud) carregarAuditoria().then(() => render()).catch(e => toast(sbErr(e), true)); } });
ACTIONS["aud-tab"] = (_, el) => { AF.tabela = el.value; SB.aud = null; render(); };
ACTIONS["aud-op"] = (_, el) => { AF.op = el.value; SB.aud = null; render(); };
ACTIONS["aud-recarregar"] = () => { SB.aud = null; render(); };

/* ---------- Minha conta e segurança ---------- */
route("seguranca", "Minha conta e segurança", () => {
  if (Store.mode !== "supabase") return "";
  if (!SB.fatores) return `<div class="empty"><b>Carregando…</b></div>`;
  const f = SB.fatores[0];
  return `<div class="grid g2">
    ${panel("Minha conta", `<div class="stat-row" style="flex-direction:column;gap:6px"><div>E-mail: <b>${esc(SB.user.email)}</b></div><div>Fazenda: <b>${esc(SB.faz.nome)}</b> · ${esc(PAPEIS[SB.papel])}</div><div>Sessão: <b>${SB.aal === "aal2" ? "confirmada com 2FA" : "somente senha"}</b></div><div>Último acesso: <b>${SB.user.last_sign_in_at ? fmtD(SB.user.last_sign_in_at.slice(0, 10)) + " " + SB.user.last_sign_in_at.slice(11, 16) : "—"}</b></div></div>
      <div class="toolbar" style="margin-top:12px"><button class="btn" data-act="sb-sair">Sair</button><button class="btn danger" data-act="sb-sair-todos">Sair de todos os dispositivos</button></div>`)}
    ${panel("Confirmação em duas etapas (2FA)", f ? `<p style="margin:0">${pill("Ativa", "good")} Aplicativo autenticador cadastrado em ${fmtD(String(f.created_at).slice(0, 10))}.</p><p class="note">Ao entrar, o sistema pede o código de 6 dígitos do aplicativo.</p><div class="toolbar"><button class="btn danger" data-act="sb-mfa-off" data-id="${esc(f.id)}" ${SB.faz.exigir_mfa ? "disabled title=\"A fazenda exige 2FA\"" : ""}>Desativar 2FA</button></div>`
      : `<p style="margin:0">${pill("Inativa", "warn")} Proteja sua conta com um código gerado no celular, além da senha.</p><div class="toolbar" style="margin-top:12px"><button class="btn pri" data-act="sb-mfa-on">Ativar 2FA</button></div>`)}
  </div>
  ${panel("Trocar senha", `<form class="form" id="fTrocaSenha" autocomplete="off">
    <div class="f"><label for="tsAtual">Senha atual</label><input class="inp" id="tsAtual" name="atual" type="password" autocomplete="current-password" required maxlength="128"></div>
    ${f ? `<div class="f"><label for="tsCod">Código 2FA</label><input class="inp" id="tsCod" name="codigo" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required></div>` : ""}
    <div class="f"><label for="tsNova">Nova senha (mín. 12)</label><input class="inp" id="tsNova" name="nova" type="password" autocomplete="new-password" required maxlength="128"></div>
    <div class="f"><label for="tsNova2">Repita a nova senha</label><input class="inp" id="tsNova2" name="nova2" type="password" autocomplete="new-password" required maxlength="128"></div>
    <div class="f s6"><div class="toolbar"><button class="btn pri" type="submit">Alterar senha</button><span class="err" id="tsErr"></span></div></div></form>`)}`;
}, {
  after: () => {
    if (Store.mode !== "supabase") return;
    if (!SB.fatores) { fatoresTotp().then(fs => { SB.fatores = fs; render(); }).catch(e => { SB.fatores = []; toast(sbErr(e), true); render(); }); return; }
    const fm = $("#fTrocaSenha"); if (!fm) return;
    fm.addEventListener("submit", async ev => {
      ev.preventDefault(); const v = Object.fromEntries(new FormData(fm).entries()); const er = $("#tsErr"); er.textContent = "";
      const fr = senhaFraca(v.nova); if (fr) { er.textContent = fr; return; } if (v.nova !== v.nova2) { er.textContent = "As senhas não conferem."; return; }
      const b = $("button[type=submit]", fm); b.disabled = true;
      try {
        const { error } = await SB.c.auth.signInWithPassword({ email: SB.user.email, password: v.atual }); if (error) throw error;
        if (SB.fatores.length) { const { error: e2 } = await SB.c.auth.mfa.challengeAndVerify({ factorId: SB.fatores[0].id, code: String(v.codigo || "").trim() }); if (e2) throw e2; }
        const { error: e3 } = await SB.c.auth.updateUser({ password: v.nova }); if (e3) throw e3;
        fm.reset(); toast("Senha alterada");
      } catch (e) { er.textContent = sbErr(e); } finally { b.disabled = false; }
    });
  }
});
ACTIONS["sb-sair-todos"] = async () => { const ok = await confirmBox("Encerrar a sessão em todos os computadores e celulares, inclusive este?", "Sair de todos", true); if (ok) sbSair("Sessões encerradas em todos os dispositivos.", true); };
ACTIONS["sb-mfa-on"] = () => { clearInterval(SB.timer); telaCadastrarMfa(false); };
ACTIONS["sb-mfa-off"] = async id => {
  if (SB.aal !== "aal2") { toast("Entre novamente confirmando o código 2FA para desativá-lo.", true); return; }
  const ok = await confirmBox("Desativar a confirmação em duas etapas? Sua conta ficará protegida apenas pela senha.", "Desativar 2FA"); if (!ok) return;
  const { error } = await SB.c.auth.mfa.unenroll({ factorId: id }); if (error) { toast(sbErr(error), true); return; }
  await SB.c.auth.refreshSession(); const { data: aal } = await SB.c.auth.mfa.getAuthenticatorAssuranceLevel(); SB.aal = (aal && aal.currentLevel) || "aal1";
  SB.fatores = null; toast("2FA desativado"); render();
};
