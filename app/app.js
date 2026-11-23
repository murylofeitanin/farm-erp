"use strict";
/* ================= UTILITÁRIOS ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = (p = "") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const num = v => { if (v === "" || v == null) return 0; const n = typeof v === "number" ? v : parseFloat(String(v).replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return isFinite(n) ? n : 0; };
const sum = (arr, f = x => x) => arr.reduce((a, x) => a + (+f(x) || 0), 0);
const groupBy = (arr, f) => { const m = new Map(); for (const x of arr) { const k = f(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; };
const nfBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2, minimumFractionDigits: 2 });
const nfBRL0 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brl = v => isFinite(v) ? nfBRL.format(Math.abs(v) < 0.005 ? 0 : v) : "—";
const brl0 = v => isFinite(v) ? nfBRL0.format(Math.abs(v) < 0.5 ? 0 : v) : "—";
const nf = (v, d = 2) => (isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v, d = 1) => isFinite(v) ? nf(v * 100, d) + "%" : "—";
const ratio = (a, b) => (b && Math.abs(b) > 1e-9) ? a / b : NaN;
const kfmt = v => { const a = Math.abs(v); if (a >= 1e6) return nf(v / 1e6, 1) + " mi"; if (a >= 1e3) return nf(v / 1e3, 0) + " mil"; return nf(v, 0); };
const signCls = v => v < -0.004 ? "neg" : "";

/* datas como 'AAAA-MM-DD' */
const pad = n => String(n).padStart(2, "0");
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const today = () => toISO(new Date());
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return toISO(d); };
const addMonths = (s, n) => { const d = parseISO(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return toISO(d); };
const monthKey = s => s.slice(0, 7);
const monthStart = s => s.slice(0, 7) + "-01";
const monthEnd = s => { const d = parseISO(monthStart(s)); return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
const fmtD = s => s ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) : "";
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtM = k => MES[+k.slice(5, 7) - 1] + "/" + k.slice(2, 4);
function monthsInRange(from, to) { const out = []; let k = monthKey(from); const end = monthKey(to); let guard = 0; while (k <= end && guard++ < 240) { out.push(k); k = monthKey(addMonths(k + "-01", 1)); } return out; }
const clampRange = (k, from, to) => { const a = k + "-01" < from ? from : k + "-01"; const e = monthEnd(k + "-01"); return [a, e > to ? to : e]; };

/* ================= CONFIGURAÇÃO DE DOMÍNIO ================= */
const GRUPOS = {
  receita: { nome: "Receita bruta", dir: 1, fluxo: "op", ordem: 1 },
  deducao: { nome: "Deduções da receita", dir: -1, fluxo: "op", ordem: 2 },
  custo: { nome: "Custos de produção", dir: -1, fluxo: "op", ordem: 3 },
  comercial: { nome: "Despesas comerciais", dir: -1, fluxo: "op", ordem: 4 },
  administrativa: { nome: "Despesas gerais e administrativas", dir: -1, fluxo: "op", ordem: 5 },
  rec_fin: { nome: "Receitas financeiras", dir: 1, fluxo: "op", ordem: 6 },
  desp_fin: { nome: "Despesas financeiras", dir: -1, fluxo: "op", ordem: 7 },
  ir: { nome: "IRPJ e CSLL", dir: -1, fluxo: "op", ordem: 8 },
  compra_insumo: { nome: "Compras de insumos (estoque)", dir: -1, fluxo: "op", ordem: 9, sistema: true },
  investimento: { nome: "Investimentos (imobilizado)", dir: -1, fluxo: "inv", ordem: 10 },
  captacao: { nome: "Captação de empréstimos", dir: 1, fluxo: "fin", ordem: 11 },
  amortizacao: { nome: "Amortização de empréstimos", dir: -1, fluxo: "fin", ordem: 12 },
  aporte: { nome: "Aportes de capital", dir: 1, fluxo: "fin", ordem: 13 },
  distribuicao: { nome: "Distribuição de lucros / retiradas", dir: -1, fluxo: "fin", ordem: 14 }
};
const DRE_GRUPOS = ["receita", "deducao", "comercial", "administrativa", "rec_fin", "desp_fin", "ir"];
const FIN_GRUPOS = ["captacao", "amortizacao", "aporte", "distribuicao"];

const DEFAULT_CATEGORIAS = [
  ["c_venda", "Venda de produção agrícola", "receita", "v"],
  ["c_outras_rec", "Outras receitas operacionais", "receita", "v"],
  ["c_funrural", "Funrural / Senar sobre vendas", "deducao", "v"],
  ["c_icms", "ICMS sobre vendas", "deducao", "v"],
  ["c_descontos", "Descontos e devoluções de vendas", "deducao", "v"],
  ["c_fert", "Fertilizantes e corretivos", "custo", "v"],
  ["c_def", "Defensivos agrícolas", "custo", "v"],
  ["c_sem", "Sementes e mudas", "custo", "v"],
  ["c_comb", "Combustíveis e lubrificantes", "custo", "v"],
  ["c_mo_fixa", "Mão de obra de campo (fixa) e encargos", "custo", "f"],
  ["c_mo_temp", "Mão de obra temporária / colheita", "custo", "v"],
  ["c_serv", "Serviços terceirizados e mecanização", "custo", "v"],
  ["c_manut", "Manutenção de máquinas e implementos", "custo", "f"],
  ["c_energia", "Energia elétrica (irrigação)", "custo", "v"],
  ["c_secagem", "Secagem, beneficiamento e armazenagem", "custo", "v"],
  ["c_arrend", "Arrendamento de terras", "custo", "f"],
  ["c_assist", "Assistência técnica e análises", "custo", "f"],
  ["c_seguro_agr", "Seguro agrícola", "custo", "f"],
  ["c_outros_custos", "Outros custos de produção", "custo", "v"],
  ["c_frete", "Fretes sobre vendas", "comercial", "v"],
  ["c_corretagem", "Corretagem e comissões", "comercial", "v"],
  ["c_classif", "Classificação, amostras e taxas de venda", "comercial", "v"],
  ["c_sal_adm", "Salários e encargos administrativos", "administrativa", "f"],
  ["c_prolabore", "Pró-labore", "administrativa", "f"],
  ["c_contab", "Contabilidade, jurídico e consultorias", "administrativa", "f"],
  ["c_util", "Energia, telefone e internet da sede", "administrativa", "f"],
  ["c_itr", "ITR, licenças e taxas", "administrativa", "f"],
  ["c_seg_ger", "Seguros gerais", "administrativa", "f"],
  ["c_adm_out", "Despesas gerais de escritório", "administrativa", "f"],
  ["c_rend", "Rendimentos de aplicações financeiras", "rec_fin", "f"],
  ["c_desc_obt", "Descontos obtidos e juros recebidos", "rec_fin", "f"],
  ["c_juros", "Juros de empréstimos e financiamentos", "desp_fin", "f"],
  ["c_tarifas", "Tarifas bancárias e IOF", "desp_fin", "f"],
  ["c_multas", "Juros e multas por atraso", "desp_fin", "f"],
  ["c_irpj", "IRPJ / CSLL / IR sobre atividade rural", "ir", "f"],
  ["c_compra_ins", "Compra de insumos para estoque", "compra_insumo", "v", true],
  ["c_inv_imob", "Aquisição de imobilizado (cadastro de bens)", "investimento", "f", true],
  ["c_inv_outros", "Outros investimentos / reformas", "investimento", "f"],
  ["c_captacao", "Captação de empréstimos e financiamentos", "captacao", "f"],
  ["c_amort", "Amortização de principal", "amortizacao", "f"],
  ["c_aporte", "Aporte de capital dos sócios", "aporte", "f"],
  ["c_distrib", "Distribuição de lucros / retiradas", "distribuicao", "f"]
].map(([id, nome, grupo, nat, sistema]) => ({ id, nome, grupo, natureza: nat === "v" ? "variavel" : "fixo", sistema: !!sistema }));

const GRUPOS_INSUMO = ["Fertilizante", "Corretivo", "Herbicida", "Fungicida", "Inseticida", "Adjuvante", "Semente / muda", "Combustível", "Lubrificante", "Peças e manutenção", "Sacaria e embalagens", "Outros"];
const INSUMO_CAT_DEFAULT = { "Fertilizante": "c_fert", "Corretivo": "c_fert", "Herbicida": "c_def", "Fungicida": "c_def", "Inseticida": "c_def", "Adjuvante": "c_def", "Semente / muda": "c_sem", "Combustível": "c_comb", "Lubrificante": "c_comb", "Peças e manutenção": "c_manut", "Sacaria e embalagens": "c_secagem", "Outros": "c_outros_custos" };
const UNIDADES_INSUMO = ["kg", "t", "L", "sc", "un", "cx", "m³"];
const SUBTIPOS = {
  saldo_inicial: { nome: "Saldo inicial (implantação)", tipo: "entrada" },
  compra: { nome: "Compra", tipo: "entrada" },
  ajuste_pos: { nome: "Ajuste de inventário (+)", tipo: "entrada" },
  aplicacao: { nome: "Aplicação / consumo", tipo: "saida" },
  perda: { nome: "Perda / avaria", tipo: "saida" },
  vencido: { nome: "Descarte por vencimento", tipo: "saida" },
  ajuste_neg: { nome: "Ajuste de inventário (−)", tipo: "saida" }
};
const OPERACOES = ["Adubação de solo", "Adubação foliar", "Calagem / gessagem", "Pulverização herbicida", "Pulverização fungicida", "Pulverização inseticida", "Plantio / replantio", "Fertirrigação", "Abastecimento de máquinas", "Manutenção", "Colheita", "Pós-colheita", "Outra"];
const TIPOS_ATIVO = [["maq", "Máquinas e implementos", 10, 10], ["vei", "Veículos", 5, 20], ["benf", "Benfeitorias e instalações", 25, 0], ["irr", "Equipamentos de irrigação", 10, 5], ["lav", "Lavouras permanentes (café, pimenta)", 15, 0], ["terra", "Terras", 0, 0], ["moveis", "Móveis, equipamentos e informática", 5, 0], ["outros", "Outros bens", 10, 0]];

const COLS = ["cfg", "culturas", "talhoes", "safras", "categorias", "lancamentos", "insumos", "movimentos", "colheitas", "ativos", "contratos", "orcamentos"];

/* ================= ARMAZENAMENTO ================= */
const S = {}; COLS.forEach(c => S[c] = new Map());
const Store = {
  mode: "local", db: null, ready: false, canWrite: true, version: 0, loaded: new Set(),
  LKEY: "gestaoAgroERP.v1",
  async init() {
    let db = null;
    try { if (window.claude && typeof window.claude.use === "function") db = await window.claude.use("db"); } catch (e) { db = null; }
    if (db) {
      this.mode = "db"; this.db = db;
      try { const user = await window.claude.use("user"); if (user && user.can) { const w = await user.can("data.write"); if (w === false) this.canWrite = false; } } catch (e) { }
      await new Promise(resolve => {
        let done = false; const finish = () => { if (!done) { done = true; resolve(); } };
        const timer = setTimeout(() => { this.slow = true; finish(); }, 10000);
        COLS.forEach(c => {
          db.collection(c).onSnapshot(snap => {
            const m = new Map(); snap.docs.forEach(d => { const v = d.data(); if (v) m.set(d.id, { ...v, id: d.id }); });
            S[c] = m; this.loaded.add(c); this.bump();
            if (!snap.metadata.fromCache && this.loaded.size === COLS.length) { clearTimeout(timer); finish(); }
            if (this.loaded.size === COLS.length && snap.metadata.fromCache) setTimeout(finish, 1500);
          }, err => { console.warn("db", c, err); this.loaded.add(c); if (err && err.code === "revoked") this.canWrite = false; if (this.loaded.size === COLS.length) { clearTimeout(timer); finish(); } });
        });
      });
    } else {
      this.mode = "local";
      try { const raw = localStorage.getItem(this.LKEY); if (raw) { const o = JSON.parse(raw); COLS.forEach(c => { (o[c] || []).forEach(x => S[c].set(x.id, x)); }); } } catch (e) { }
    }
    this.ready = true;
  },
  bump() { this.version++; scheduleRender(); },
  saveLocal() {
    if (this.mode !== "local") return;
    clearTimeout(this._t); this._t = setTimeout(() => { try { const o = {}; COLS.forEach(c => o[c] = [...S[c].values()]); localStorage.setItem(this.LKEY, JSON.stringify(o)); } catch (e) { } }, 250);
  },
  clean(o) { const r = {}; for (const [k, v] of Object.entries(o)) { if (v === undefined || k === "id") continue; r[k] = v; } return r; },
  async put(col, obj) {
    if (!obj.id) obj.id = uid();
    S[col].set(obj.id, { ...obj }); this.bump(); this.saveLocal();
    if (this.mode === "db") await this.retry(() => this.db.collection(col).doc(obj.id).set(this.clean(obj)));
    return obj;
  },
  async del(col, id) {
    S[col].delete(id); this.bump(); this.saveLocal();
    if (this.mode === "db") await this.retry(() => this.db.collection(col).doc(id).delete());
  },
  async retry(fn, n = 4) {
    for (let i = 0; ; i++) {
      try { return await fn(); } catch (e) {
        const code = e && e.code;
        if (code === "invalid_argument" && !this.canWriteChecked) { this.canWrite = false; }
        if (i >= n || !["unavailable", "resource_exhausted"].includes(code)) { toast(errMsg(e), true); throw e; }
        await new Promise(r => setTimeout(r, 400 * (i + 1) + Math.random() * 400));
      }
    }
  },
  /* grava muitos documentos com concorrência limitada */
  async bulk(ops, onProgress) {
    let i = 0, done = 0; const total = ops.length;
    ops.forEach(op => { if (op.op === "put") { if (!op.obj.id) op.obj.id = uid(); S[op.col].set(op.obj.id, { ...op.obj }); } else S[op.col].delete(op.id); });
    this.bump(); this.saveLocal();
    if (this.mode !== "db") { onProgress && onProgress(1); return; }
    const worker = async () => {
      while (i < ops.length) {
        const op = ops[i++];
        await this.retry(() => op.op === "put" ? this.db.collection(op.col).doc(op.obj.id).set(this.clean(op.obj)) : this.db.collection(op.col).doc(op.id).delete(), 6);
        done++; onProgress && onProgress(done / total);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }
};
function errMsg(e) {
  const c = e && e.code;
  if (c === "invalid_argument") return "Sem permissão para gravar ou dado inválido. Peça acesso de edição ao dono do sistema.";
  if (c === "quota_exceeded") return "Limite de armazenamento atingido. Exclua registros antigos para continuar.";
  if (c === "revoked") return "O acesso a este sistema foi alterado. Recarregue a página.";
  return "Não foi possível gravar agora. Tente de novo em instantes.";
}
const all = c => [...S[c].values()];
const get = (c, id) => S[c].get(id);
const cfg = () => S.cfg.get("main") || {};

/* ================= MOTOR CONTÁBIL ================= */
let _E = null, _Ev = -1;
function E() { if (_Ev !== Store.version || !_E) { _E = buildEngine(); _Ev = Store.version; } return _E; }

function buildEngine() {
  const C = cfg();
  const abertura = C.dataAbertura || "2000-01-01";
  const cat = S.categorias, cult = S.culturas, tal = S.talhoes, ins = S.insumos;
  const safras = all("safras").sort((a, b) => a.inicio < b.inicio ? -1 : 1);
  const safraOf = d => { const s = safras.find(s => d >= s.inicio && d <= s.fim); return s ? s.id : ""; };
  const talAtivos = all("talhoes").filter(t => t.ativo !== false && num(t.area) > 0);
  const areaTot = sum(talAtivos, t => num(t.area));
  const areaCult = new Map(); talAtivos.forEach(t => areaCult.set(t.culturaId, (areaCult.get(t.culturaId) || 0) + num(t.area)));
  const grupoOf = catId => (cat.get(catId) || {}).grupo || "";

  function allocate(v, talhaoId, culturaId) {
    const t = talhaoId && tal.get(talhaoId);
    if (t) return [{ talhaoId, culturaId: culturaId || t.culturaId, v }];
    if (culturaId) { const ts = talAtivos.filter(t => t.culturaId === culturaId); const a = sum(ts, t => num(t.area)); if (a > 0) return ts.map(t => ({ talhaoId: t.id, culturaId, v: v * num(t.area) / a })); return [{ talhaoId: "", culturaId, v }]; }
    if (areaTot > 0) return talAtivos.map(t => ({ talhaoId: t.id, culturaId: t.culturaId, v: v * num(t.area) / areaTot }));
    return [{ talhaoId: "", culturaId: "", v }];
  }

  /* --- estoque de insumos: custo médio ponderado móvel --- */
  const movs = all("movimentos").sort((a, b) => a.data === b.data ? ((SUBTIPOS[a.subtipo] || {}).tipo === "entrada" ? -1 : 1) - ((SUBTIPOS[b.subtipo] || {}).tipo === "entrada" ? -1 : 1) || String(a.criado || "").localeCompare(String(b.criado || "")) : (a.data < b.data ? -1 : 1));
  const insSt = new Map(); const mv = new Map();
  for (const m of movs) {
    let st = insSt.get(m.insumoId); if (!st) { st = { qtd: 0, valor: 0, lastCu: 0, hist: [] }; insSt.set(m.insumoId, st); }
    const q = num(m.qtd); const tipo = (SUBTIPOS[m.subtipo] || {}).tipo; let val = 0, cu = 0;
    if (tipo === "entrada") {
      cu = num(m.valorUnit); if (!cu && m.subtipo === "ajuste_pos") cu = st.qtd > 0 ? st.valor / st.qtd : st.lastCu;
      val = q * cu; st.qtd += q; st.valor += val; if (cu) st.lastCu = cu;
    } else {
      cu = st.qtd > 1e-9 && st.valor > 0 ? st.valor / st.qtd : st.lastCu; val = q * cu;
      if (st.qtd > 1e-9 && Math.abs(q - st.qtd) < 1e-9) val = st.valor;
      st.qtd -= q; st.valor -= val;
    }
    mv.set(m.id, { valor: val, cu, saldoQtd: st.qtd, saldoValor: st.valor, tipo });
    st.hist.push({ data: m.data, qtd: st.qtd, valor: st.valor });
  }
  function stockAt(D, insumoId) {
    let q = 0, v = 0;
    const one = st => { let last = null; for (const h of st.hist) { if (h.data <= D) last = h; else break; } if (last) { q += last.qtd; v += last.valor; } };
    if (insumoId) { const st = insSt.get(insumoId); if (st) one(st); } else insSt.forEach(one);
    return { qtd: q, valor: v };
  }

  /* --- custos de produção por cultura/safra/talhão --- */
  const costs = []; // {data, culturaId, safraId, talhaoId, catId, v, variavel, origem, insumoId}
  for (const m of movs) {
    if (m.subtipo !== "aplicacao" || m.destino === "adm") continue;
    const val = mv.get(m.id).valor; const i = ins.get(m.insumoId) || {};
    const catId = i.categoriaId || INSUMO_CAT_DEFAULT[i.grupo] || "c_outros_custos";
    const sf = m.safraId || safraOf(m.data);
    allocate(val, m.destino === "talhao" ? m.talhaoId : "", m.destino === "talhao" ? m.culturaId : "").forEach(a => costs.push({ data: m.data, culturaId: a.culturaId, safraId: sf, talhaoId: a.talhaoId, catId, v: a.v, variavel: true, origem: "insumo", insumoId: m.insumoId, movId: m.id }));
  }
  const lancs = all("lancamentos");
  for (const l of lancs) {
    if (grupoOf(l.categoriaId) !== "custo") continue;
    const sf = l.safraId || safraOf(l.competencia); const c = cat.get(l.categoriaId);
    allocate(num(l.valor), l.talhaoId, l.culturaId).forEach(a => costs.push({ data: l.competencia, culturaId: a.culturaId, safraId: sf, talhaoId: a.talhaoId, catId: l.categoriaId, v: a.v, variavel: c.natureza !== "fixo", origem: "lanc", lancId: l.id }));
  }
  const key = (c, s) => c + "|" + s;
  const cs = new Map(); // key -> {custo, custoVar, colhido, vendido}
  const csGet = (c, s) => { const k = key(c, s); let o = cs.get(k); if (!o) { o = { culturaId: c, safraId: s, custo: 0, custoVar: 0, colhido: 0, vendido: 0, receita: 0 }; cs.set(k, o); } return o; };
  costs.forEach(x => { const o = csGet(x.culturaId, x.safraId); o.custo += x.v; if (x.variavel) o.custoVar += x.v; });
  const colheitas = all("colheitas").map(h => ({ ...h, culturaId: h.culturaId || (tal.get(h.talhaoId) || {}).culturaId || "", safraId: h.safraId || safraOf(h.data), qtd: num(h.qtd) }));
  colheitas.forEach(h => { csGet(h.culturaId, h.safraId).colhido += h.qtd; });
  const vendas = lancs.filter(l => grupoOf(l.categoriaId) === "receita" && l.culturaId && num(l.qtd) > 0).map(l => ({ ...l, safraId: l.safraId || safraOf(l.competencia), qtd: num(l.qtd), valor: num(l.valor) }));
  vendas.forEach(v => { const o = csGet(v.culturaId, v.safraId); o.vendido += v.qtd; o.receita += v.valor; });
  cs.forEach(o => { o.cu = o.colhido > 0 ? o.custo / o.colhido : 0; o.varShare = o.custo > 0 ? o.custoVar / o.custo : 1; });
  const cuOf = (c, s) => (cs.get(key(c, s)) || {}).cu || 0;
  vendas.forEach(v => { const o = cs.get(key(v.culturaId, v.safraId)); v.cmv = v.qtd * (o ? o.cu : 0); v.cmvVar = v.cmv * (o ? o.varShare : 1); });

  /* --- depreciação linear diária --- */
  const ativos = all("ativos").map(a => {
    const tipo = TIPOS_ATIVO.find(t => t[0] === a.tipo) || TIPOS_ATIVO[7];
    const vida = num(a.vidaUtil); const base = Math.max(0, num(a.valor) - num(a.residual));
    const dias = vida > 0 ? vida * 365.25 : 0;
    return { ...a, tipoNome: tipo[1], base, dias, valor: num(a.valor) };
  });
  function depAcum(a, D) { if (!a.dias || D < a.dataAquisicao) return 0; const d = daysBetween(a.dataAquisicao, D) + 1; return Math.min(a.base, a.base * d / a.dias); }
  function depPeriodo(from, to) {
    let t = 0; const por = [];
    ativos.forEach(a => { const ini = a.origem === "abertura" ? (abertura > from ? abertura : from) : from; if (ini > to) return; const v = depAcum(a, to) - depAcum(a, addDays(ini, -1)); if (v > 0.0001) { t += v; por.push({ a, v }); } });
    return { total: t, por };
  }

  return { C, abertura, safras, safraOf, talAtivos, areaTot, areaCult, grupoOf, allocate, mv, insSt, stockAt, costs, cs, cuOf, colheitas, vendas, ativos, depAcum, depPeriodo, lancs, movs, key };
}

/* ---------- DRE ---------- */
function dre(from, to) {
  if (to > today()) to = today();
  const e = E(); const lines = {}; DRE_GRUPOS.forEach(g => lines[g] = { total: 0, porCat: new Map(), var: 0 });
  for (const l of e.lancs) {
    const g = e.grupoOf(l.categoriaId); if (!lines[g]) continue;
    if (l.competencia < from || l.competencia > to) continue;
    const v = num(l.valor); const L = lines[g]; L.total += v; L.porCat.set(l.categoriaId, (L.porCat.get(l.categoriaId) || 0) + v);
    const c = S.categorias.get(l.categoriaId); if (c && c.natureza !== "fixo") L.var += v;
  }
  // custo dos produtos vendidos
  let cmv = 0, cmvVar = 0; const cmvCult = new Map();
  e.vendas.forEach(v => { if (v.competencia < from || v.competencia > to) return; cmv += v.cmv; cmvVar += v.cmvVar; cmvCult.set(v.culturaId, (cmvCult.get(v.culturaId) || 0) + v.cmv); });
  // perdas, ajustes e consumo administrativo de insumos
  let perdas = 0, admIns = 0;
  e.movs.forEach(m => {
    if (m.data < from || m.data > to) return; const val = e.mv.get(m.id).valor;
    if (m.subtipo === "perda" || m.subtipo === "vencido" || m.subtipo === "ajuste_neg") perdas += val;
    else if (m.subtipo === "ajuste_pos") perdas -= val;
    else if (m.subtipo === "aplicacao" && m.destino === "adm") admIns += val;
  });
  const dep = e.depPeriodo(from, to);
  const rb = lines.receita.total, ded = lines.deducao.total, rl = rb - ded;
  const custoTotal = cmv + perdas; const lb = rl - custoTotal;
  const com = lines.comercial.total, adm = lines.administrativa.total + admIns;
  const ebitda = lb - com - adm; const ebit = ebitda - dep.total;
  const rf = lines.rec_fin.total, df = lines.desp_fin.total; const lair = ebit + rf - df; const ir = lines.ir.total; const ll = lair - ir;
  // margem de contribuição: custos e despesas variáveis vs fixos
  const cv = cmvVar + Math.max(0, perdas) + lines.comercial.var + lines.administrativa.var;
  const mc = rl - cv; const cf = (cmv - cmvVar) + Math.min(0, perdas) + (com - lines.comercial.var) + (adm - lines.administrativa.var);
  const mcPct = ratio(mc, rl);
  return { from, to, lines, rb, ded, rl, cmv, cmvCult, perdas, custoTotal, lb, com, adm, admIns, ebitda, dep: dep.total, depPor: dep.por, ebit, rf, df, lair, ir, ll, cv, cf, mc, mcPct,
    peContabil: mcPct > 0 ? (cf + dep.total) / mcPct : NaN, peFinanceiro: mcPct > 0 ? cf / mcPct : NaN };
}

/* ---------- Caixa e fluxo ---------- */
function signedVal(l) { const g = GRUPOS[E().grupoOf(l.categoriaId)]; return num(l.valor) * (g ? g.dir : -1); }
function caixaEm(D) {
  const e = E(); let c = D >= e.abertura ? num(e.C.caixaInicial) : 0;
  for (const l of e.lancs) if (l.pagamento && l.pagamento <= D) c += signedVal(l);
  return c;
}
function dfcDireto(from, to) {
  const e = E(); const g = {}; Object.keys(GRUPOS).forEach(k => g[k] = { total: 0, porCat: new Map() });
  for (const l of e.lancs) {
    if (!l.pagamento || l.pagamento < from || l.pagamento > to) continue;
    const k = e.grupoOf(l.categoriaId); if (!g[k]) continue; const v = signedVal(l);
    g[k].total += v; g[k].porCat.set(l.categoriaId, (g[k].porCat.get(l.categoriaId) || 0) + v);
  }
  const op = sum(Object.keys(GRUPOS).filter(k => GRUPOS[k].fluxo === "op"), k => g[k].total);
  const inv = sum(Object.keys(GRUPOS).filter(k => GRUPOS[k].fluxo === "inv"), k => g[k].total);
  const fin = sum(Object.keys(GRUPOS).filter(k => GRUPOS[k].fluxo === "fin"), k => g[k].total);
  const ini = caixaEm(addDays(from, -1)); const implant = (e.abertura >= from && e.abertura <= to) ? num(e.C.caixaInicial) : 0;
  return { g, op, inv, fin, liq: op + inv + fin, ini, implant, fim: ini + implant + op + inv + fin };
}

/* ---------- Balanço patrimonial ---------- */
function balanco(D) {
  if (D > today()) D = today();
  const e = E(); const C = e.C;
  const r = { D };
  r.caixa = caixaEm(D);
  let ar = 0, advForn = 0, advInv = 0, apForn = 0, apFisc = 0, advCli = 0, apInvCP = 0, apInvLP = 0, outrosInv = 0;
  let emprest = 0, aportes = 0, distrib = 0, amortCP = 0;
  const lim = addDays(D, 365);
  for (const l of e.lancs) {
    const g = e.grupoOf(l.categoriaId); const v = num(l.valor); const pago = l.pagamento && l.pagamento <= D;
    if (FIN_GRUPOS.includes(g)) {
      if (pago) { if (g === "captacao") emprest += v; else if (g === "amortizacao") emprest -= v; else if (g === "aporte") aportes += v; else distrib += v; }
      else if (g === "amortizacao" && l.vencimento && l.vencimento <= lim) amortCP += v;
      continue;
    }
    if (g === "investimento" && !l.ativoId && l.competencia <= D) outrosInv += v;
    const comp = l.competencia <= D;
    if (comp && !pago) {
      if (GRUPOS[g] && GRUPOS[g].dir > 0) ar += v;
      else if (g === "investimento") { if ((l.vencimento || l.competencia) > lim) apInvLP += v; else apInvCP += v; }
      else if (g === "deducao" || g === "ir") apFisc += v; else apForn += v;
    } else if (!comp && pago) {
      if (GRUPOS[g] && GRUPOS[g].dir > 0) advCli += v; else if (g === "investimento") advInv += v; else advForn += v;
    }
  }
  // contratos com saldo na implantação
  all("contratos").forEach(c => { if (num(c.saldoInicial) > 0 && D >= e.abertura) emprest += num(c.saldoInicial); });
  r.ar = ar; r.advForn = advForn; r.advInv = advInv;
  r.estIns = e.stockAt(D).valor;
  // estoques de produtos e lavouras em formação
  let custosAte = 0; e.costs.forEach(x => { if (x.data <= D) custosAte += x.v; });
  let cmvAte = 0; e.vendas.forEach(v => { if (v.competencia <= D) cmvAte += v.cmv; });
  let estProd = 0; const prodPor = [];
  e.cs.forEach(o => {
    const colh = sum(e.colheitas.filter(h => h.culturaId === o.culturaId && h.safraId === o.safraId && h.data <= D), h => h.qtd);
    const vend = sum(e.vendas.filter(v => v.culturaId === o.culturaId && v.safraId === o.safraId && v.competencia <= D), v => v.qtd);
    const val = (colh - vend) * o.cu; if (Math.abs(val) > 0.005) { estProd += val; prodPor.push({ o, qtd: colh - vend, val }); }
  });
  r.estProd = estProd; r.prodPor = prodPor; r.wip = custosAte - cmvAte - estProd;
  r.ac = r.caixa + r.ar + r.advForn + r.advInv + r.estIns + r.estProd + r.wip;
  // imobilizado
  const imobPor = new Map(); let imobBruto = 0, depAc = 0;
  e.ativos.forEach(a => { if (a.dataAquisicao > D) return; if (a.origem === "abertura" && D < e.abertura) return; imobBruto += a.valor; imobPor.set(a.tipoNome, (imobPor.get(a.tipoNome) || 0) + a.valor); depAc += e.depAcum(a, D); });
  if (outrosInv) { imobBruto += outrosInv; imobPor.set("Outros investimentos (sem cadastro)", (imobPor.get("Outros investimentos (sem cadastro)") || 0) + outrosInv); }
  r.imobBruto = imobBruto; r.imobPor = imobPor; r.depAc = depAc; r.anc = imobBruto - depAc; r.at = r.ac + r.anc;
  // passivo
  r.apForn = apForn; r.apFisc = apFisc; r.advCli = advCli; r.apInvCP = apInvCP; r.apInvLP = apInvLP;
  r.emprest = emprest; r.emprestCP = Math.max(0, Math.min(emprest, amortCP)); r.emprestLP = emprest - r.emprestCP;
  r.pc = apForn + apFisc + advCli + apInvCP + r.emprestCP; r.pnc = r.emprestLP + apInvLP;
  // patrimônio líquido
  const insIni = sum(e.movs.filter(m => m.subtipo === "saldo_inicial" && m.data <= D), m => e.mv.get(m.id).valor);
  const ativIni = D < e.abertura ? 0 : sum(e.ativos.filter(a => a.origem === "abertura" && a.dataAquisicao <= D), a => a.valor - e.depAcum(a, addDays(e.abertura, -1)));
  const contrIni = D >= e.abertura ? sum(all("contratos"), c => num(c.saldoInicial)) : 0;
  r.plAbertura = (D >= e.abertura ? num(C.caixaInicial) : 0) + insIni + ativIni - contrIni;
  r.capital = num(C.capitalSocial); r.reservasAbertura = r.plAbertura - r.capital;
  r.aportes = aportes; r.distrib = distrib;
  const anoIni = D.slice(0, 4) + "-01-01";
  r.resAnteriores = dre("1900-01-01", addDays(anoIni, -1)).ll;
  r.resExercicio = dre(anoIni, D).ll;
  r.pl = r.capital + r.reservasAbertura + aportes - distrib + r.resAnteriores + r.resExercicio;
  r.pt = r.pc + r.pnc + r.pl;
  r.diff = r.at - r.pt;
  return r;
}

/* ---------- DFC indireto ---------- */
function dfcIndireto(from, to) {
  const d = dre(from, to); const a = balanco(addDays(from, -1)); const b = balanco(to); const e = E();
  const siIns = sum(e.movs.filter(m => m.subtipo === "saldo_inicial" && m.data >= from && m.data <= to), m => e.mv.get(m.id).valor);
  const items = [
    ["Lucro líquido do período", d.ll],
    ["(+) Depreciação e amortização", d.dep],
    ["(Aumento) redução de contas a receber", -(b.ar - a.ar)],
    ["(Aumento) redução de adiantamentos a fornecedores", -(b.advForn - a.advForn)],
    ["(Aumento) redução de estoque de insumos", -((b.estIns - a.estIns) - siIns)],
    ["(Aumento) redução de produtos e lavouras em formação", -((b.estProd + b.wip) - (a.estProd + a.wip))],
    ["Aumento (redução) de fornecedores", (b.apForn - a.apForn)],
    ["Aumento (redução) de obrigações fiscais", (b.apFisc - a.apFisc)],
    ["Aumento (redução) de adiantamentos de clientes", (b.advCli - a.advCli)]
  ];
  const op = sum(items, x => x[1]);
  return { items, op, d };
}

/* ---------- Indicadores ---------- */
function indicadores(from, to) {
  if (to > today()) to = today(); if (from > to) from = to;
  const d = dre(from, to); const b0 = balanco(addDays(from, -1)); const b = balanco(to); const f = dfcDireto(from, to);
  const dias = Math.max(1, daysBetween(from, to) + 1); const anual = 365 / dias;
  const estoques = x => x.estIns + x.estProd + x.wip;
  const e = E();
  const compras = sum(e.lancs.filter(l => l.competencia >= from && l.competencia <= to && ["compra_insumo", "custo", "comercial", "administrativa"].includes(e.grupoOf(l.categoriaId))), l => num(l.valor));
  const pmre = d.cmv > 0 ? ((estoques(b0) + estoques(b)) / 2) / d.cmv * dias : NaN;
  const pmr = d.rb > 0 ? ((b0.ar + b.ar) / 2) / d.rb * dias : NaN;
  const pmp = compras > 0 ? (((b0.apForn) + (b.apForn)) / 2) / compras * dias : NaN;
  const passivo = b.pc + b.pnc;
  const divida = b.emprest; const divLiq = divida - b.caixa;
  return {
    d, b, b0, f, dias, anual,
    margemBruta: ratio(d.lb, d.rl), margemContrib: d.mcPct, margemEbitda: ratio(d.ebitda, d.rl), margemLiquida: ratio(d.ll, d.rl), margemOper: ratio(d.ebit, d.rl),
    liqCorrente: ratio(b.ac, b.pc), liqSeca: ratio(b.ac - estoques(b), b.pc), liqImediata: ratio(b.caixa, b.pc), liqGeral: ratio(b.ac, passivo),
    endivGeral: ratio(passivo, b.at), composicao: ratio(b.pc, passivo), capTerceiros: ratio(passivo, b.pl), imobPL: ratio(b.anc, b.pl),
    divida, divLiq, divLiqEbitda: d.ebitda > 0 ? divLiq / (d.ebitda * anual) : NaN, coberturaJuros: ratio(d.ebitda, d.df),
    roe: ratio(d.ll, (b.pl + b0.pl) / 2), roa: ratio(d.ll, (b.at + b0.at) / 2),
    fco: f.op, fcl: f.op + f.inv, geracaoLiq: f.liq, conversaoCaixa: ratio(f.op, d.ebitda),
    pmre, pmr, pmp, ccc: (isFinite(pmre) ? pmre : 0) + (isFinite(pmr) ? pmr : 0) - (isFinite(pmp) ? pmp : 0)
  };
}

/* ---------- Produção por talhão / cultura numa safra ---------- */
function producaoSafra(safraId) {
  const e = E(); const s = get("safras", safraId); if (!s) return { talhoes: [], culturas: [] };
  const rows = new Map();
  const row = (tid, cid) => { const k = tid || ("_" + cid); let r = rows.get(k); if (!r) { const t = get("talhoes", tid); r = { talhaoId: tid, nome: t ? t.nome : "Sem talhão (" + ((get("culturas", cid) || {}).nome || "geral") + ")", culturaId: cid || (t && t.culturaId) || "", area: t ? num(t.area) : 0, colhido: 0, custo: 0, custoVar: 0, porCat: new Map(), insumos: 0 }; rows.set(k, r); } return r; };
  e.talAtivos.forEach(t => row(t.id, t.culturaId));
  e.costs.forEach(x => { if (x.safraId !== safraId) return; const r = row(x.talhaoId, x.culturaId); r.custo += x.v; if (x.variavel) r.custoVar += x.v; r.porCat.set(x.catId, (r.porCat.get(x.catId) || 0) + x.v); if (x.origem === "insumo") r.insumos += x.v; });
  e.colheitas.forEach(h => { if (h.safraId !== safraId) return; row(h.talhaoId, h.culturaId).colhido += h.qtd; });
  const precoCult = new Map();
  all("culturas").forEach(c => { const vs = e.vendas.filter(v => v.culturaId === c.id && v.safraId === safraId); const q = sum(vs, v => v.qtd); precoCult.set(c.id, q > 0 ? sum(vs, v => v.valor) / q : num(c.precoRef)); });
  const talhoes = [...rows.values()].filter(r => r.area > 0 || r.custo > 0 || r.colhido > 0).map(r => {
    const preco = precoCult.get(r.culturaId) || 0; const receita = r.colhido * preco;
    return { ...r, preco, receita, prod: ratio(r.colhido, r.area), custoHa: ratio(r.custo, r.area), custoUn: ratio(r.custo, r.colhido), receitaHa: ratio(receita, r.area), margemHa: ratio(receita - r.custo, r.area), margem: receita - r.custo, peHa: preco > 0 ? ratio(r.custo / preco, r.area) : NaN };
  });
  const culturas = [...groupBy(talhoes, r => r.culturaId).entries()].map(([cid, rs]) => {
    const c = get("culturas", cid) || { nome: "Sem cultura", unidade: "un", kgUnidade: 1 };
    const area = sum(rs, r => r.area), colhido = sum(rs, r => r.colhido), custo = sum(rs, r => r.custo), receita = sum(rs, r => r.receita), custoVar = sum(rs, r => r.custoVar);
    const o = e.cs.get(e.key(cid, safraId)) || {}; const preco = precoCult.get(cid) || 0;
    return { culturaId: cid, c, area, colhido, custo, custoVar, receita, preco, vendido: o.vendido || 0, receitaVendas: o.receita || 0, prod: ratio(colhido, area), prodKg: ratio(colhido * num(c.kgUnidade || 1), area), custoHa: ratio(custo, area), custoUn: ratio(custo, colhido), margemHa: ratio(receita - custo, area), margem: receita - custo, peHa: preco > 0 ? ratio(custo / preco, area) : NaN, mcUn: preco - ratio(custoVar, colhido) };
  }).sort((a, b) => b.area - a.area);
  return { talhoes, culturas, safra: s };
}

/* ---------- Estoque de insumos: relatório ---------- */
function estoqueInsumos(from, to) {
  const e = E(); const dias = Math.max(1, daysBetween(from, to) + 1);
  const rows = all("insumos").map(i => {
    const ini = e.stockAt(addDays(from, -1), i.id), fim = e.stockAt(to, i.id);
    const ms = e.movs.filter(m => m.insumoId === i.id && m.data >= from && m.data <= to);
    const agg = t => { const x = ms.filter(m => t.includes(m.subtipo)); return { q: sum(x, m => num(m.qtd)), v: sum(x, m => e.mv.get(m.id).valor) }; };
    const compras = agg(["compra"]), consumo = agg(["aplicacao"]), perdas = agg(["perda", "vencido", "ajuste_neg"]), ajPos = agg(["ajuste_pos"]), si = agg(["saldo_inicial"]);
    const saidas = consumo.q + perdas.q;
    const consDia = consumo.q / dias;
    const comprasAll = e.movs.filter(m => m.insumoId === i.id && m.subtipo === "compra");
    const ult = comprasAll[comprasAll.length - 1];
    const precoMedio = compras.q > 0 ? compras.v / compras.q : NaN;
    const estMedio = (ini.valor + fim.valor) / 2;
    let status = "ok"; const min = num(i.estoqueMin);
    if (fim.qtd <= 1e-9) status = "zerado"; else if (min > 0 && fim.qtd < min) status = "repor"; else if (consumo.q === 0 && fim.qtd > 0) status = "parado";
    return { i, ini, fim, compras, consumo, perdas, ajPos, si, consDia, cobertura: consDia > 0 ? fim.qtd / consDia : NaN, pctPerda: ratio(perdas.q, saidas), giro: ratio(consumo.v, estMedio), cu: fim.qtd > 1e-9 ? fim.valor / fim.qtd : (e.insSt.get(i.id) || {}).lastCu || 0, ultPreco: ult ? num(ult.valorUnit) : NaN, ultData: ult ? ult.data : "", precoMedio, status, min };
  });
  // curva ABC pelo valor consumido
  const tot = sum(rows, r => r.consumo.v); let acc = 0;
  [...rows].sort((a, b) => b.consumo.v - a.consumo.v).forEach(r => { acc += r.consumo.v; const p = tot > 0 ? acc / tot : 1; r.abcAcc = p; r.abc = r.consumo.v <= 0 ? "—" : (p <= 0.8 + 1e-9 ? "A" : p <= 0.95 + 1e-9 ? "B" : "C"); r.abcShare = tot > 0 ? r.consumo.v / tot : 0; });
  return rows;
}

/* ---------- Títulos ---------- */
function statusLanc(l) {
  if (l.pagamento) return "pago";
  const h = today(); if ((l.vencimento || l.competencia) < h) return "vencido";
  return "aberto";
}
/* ================= INTERFACE: infraestrutura ================= */
const ICONS = {
  painel: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  lanc: '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  venda: '<path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/>',
  colheita: '<path d="M12 22V8"/><path d="M5 12c3 0 7 1 7 5M19 12c-3 0-7 1-7 5"/><path d="M12 8c-2-2-2-5 0-6 2 1 2 4 0 6z"/>',
  estoque: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  orc: '<path d="M4 19V5M4 19h16"/><path d="M8 15l4-4 3 3 5-6"/>',
  talhao: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  cultura: '<path d="M7 20c0-8 4-13 12-15-1 8-5 13-12 15z"/><path d="M7 20c2-5 5-8 9-11"/>',
  insumo: '<path d="M9 3h6v4l4 6v8H5v-8l4-6z"/><path d="M5 14h14"/>',
  contas: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  ativo: '<path d="M3 17h18M5 17V9l7-5 7 5v8"/><path d="M9 17v-5h6v5"/>',
  banco: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  dre: '<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
  fluxo: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  balanco: '<path d="M12 3v18M5 7h14M5 7l-3 7h6zM19 7l-3 7h6z"/>',
  ind: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 12l6-6M21 3v6h-6"/>',
  prod: '<path d="M3 21V10l5 3V8l5 3V6l8 4v11z"/>',
  relest: '<path d="M4 4h16v4H4zM4 10h16v4H4zM4 16h16v4H4z"/>',
  aging: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  comp: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  cfg: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', dl: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', check: '<path d="M5 12l5 5L20 7"/>'
};
const ico = (n, cls = "ico") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;

const NAV = [
  { g: "Visão geral", items: [["painel", "Painel", "painel"]] },
  { g: "Operações", items: [["lancamentos", "Contas a pagar e receber", "lanc"], ["vendas", "Vendas", "venda"], ["colheitas", "Colheitas", "colheita"], ["movimentos", "Estoque de insumos", "estoque"], ["orcamento", "Orçamento da safra", "orc"]] },
  { g: "Relatórios", items: [["dre", "DRE gerencial", "dre"], ["fluxo", "Fluxo de caixa", "fluxo"], ["balanco", "Balanço patrimonial", "balanco"], ["indicadores", "Indicadores", "ind"], ["producao", "Produção e custos", "prod"], ["rel-estoque", "Relatórios de estoque", "relest"], ["comparativo", "Orçado × realizado", "comp"], ["aging", "Vencimentos e endividamento", "aging"]] },
  { g: "Cadastros", items: [["talhoes", "Talhões", "talhao"], ["culturas", "Culturas e safras", "cultura"], ["insumos", "Insumos", "insumo"], ["ativos", "Patrimônio", "ativo"], ["contratos", "Financiamentos", "banco"], ["categorias", "Plano de contas", "contas"], ["configuracoes", "Configurações", "cfg"]] }
];
const ROUTES = {};
const P = { from: "", to: "", preset: "" };
let VIEW = { dirty: false };

function routeName() { const h = (location.hash || "").replace("#", ""); return ROUTES[h] ? h : "painel"; }
function renderNav() {
  const cur = routeName(); const e = Store.ready ? E() : null;
  const vencidos = Store.ready ? all("lancamentos").filter(l => statusLanc(l) === "vencido").length : 0;
  let alertEst = 0; if (Store.ready && all("insumos").length) { const h = today(); alertEst = all("insumos").filter(i => { const s = e.stockAt(h, i.id).qtd; return num(i.estoqueMin) > 0 && s < num(i.estoqueMin); }).length; }
  $("#nav").innerHTML = NAV.map(sec => `<div class="nav-group"><div class="nav-label">${sec.g}</div>${sec.items.map(([r, n, i]) => {
    let b = ""; if (r === "lancamentos" && vencidos) b = `<span class="badge" title="Títulos vencidos">${vencidos}</span>`; if (r === "movimentos" && alertEst) b = `<span class="badge" title="Insumos abaixo do mínimo">${alertEst}</span>`;
    return `<a href="#${r}" class="${r === cur ? "on" : ""}">${ico(i)}<span>${n}</span>${b}</a>`;
  }).join("")}</div>`).join("");
}
let _rq = 0;
function scheduleRender() { if (_rq) return; _rq = requestAnimationFrame(() => { _rq = 0; if (Store.ready && !VIEW.dirty) render(); else if (Store.ready) renderNav(); }); }
function render(keepScroll = true) {
  if (!Store.ready) return;
  const C = cfg(); $("#farmName").textContent = C.fazenda || "Fazenda não configurada";
  const r = routeName(); const def = ROUTES[r];
  const crumb = NAV.find(s => s.items.some(i => i[0] === r));
  $("#pageCrumb").textContent = crumb ? crumb.g : ""; $("#pageName").textContent = def.title;
  $("#periodBar").hidden = !def.period;
  renderNav();
  const y = window.scrollY;
  $("#sideFoot").innerHTML = Store.footHTML ? Store.footHTML() : Store.mode === "db" ? (Store.canWrite ? "Dados salvos no banco do sistema, sincronizados entre usuários." : "Acesso somente leitura.") : "Modo local: dados ficam só neste navegador.";
  if (!S.cfg.get("main")) { $("#view").innerHTML = viewWelcome(); bindView(); return; }
  try { $("#view").innerHTML = def.render(); } catch (err) { console.error(err); $("#view").innerHTML = `<div class="panel panel-b"><b>Não foi possível montar esta tela.</b><div class="note">${esc(err.message)}</div></div>`; }
  bindView(); if (def.after) def.after();
  if (keepScroll) window.scrollTo(0, y);
}
function route(name, title, fn, opts = {}) { ROUTES[name] = { title, render: fn, period: !!opts.period, after: opts.after }; }

/* ---------- período global ---------- */
function presets() {
  const h = today(); const y = h.slice(0, 4); const e = E(); const list = [];
  e.safras.slice().reverse().forEach(s => list.push(["s:" + s.id, "Safra " + s.nome, s.inicio, s.fim]));
  list.push(["ano", "Ano " + y, y + "-01-01", y + "-12-31"]);
  list.push(["anoant", "Ano " + (y - 1), (y - 1) + "-01-01", (y - 1) + "-12-31"]);
  list.push(["mes", "Mês atual", monthStart(h), monthEnd(h)]);
  list.push(["12m", "Últimos 12 meses", monthStart(addMonths(h, -11)), monthEnd(h)]);
  list.push(["tudo", "Desde a implantação", e.abertura, monthEnd(h)]);
  list.push(["custom", "Personalizado", "", ""]);
  return list;
}
function initPeriod() {
  let saved = null; try { saved = JSON.parse(localStorage.getItem("gestaoAgroERP.periodo") || "null"); } catch (e) { }
  const ps = presets();
  if (saved && saved.from && saved.to) Object.assign(P, saved);
  else { const s = ps.find(p => p[0].startsWith("s:") && today() >= p[2] && today() <= p[3]) || ps.find(p => p[0] === "ano"); P.preset = s[0]; P.from = s[2]; P.to = s[3]; }
  syncPeriodUI();
}
function syncPeriodUI() {
  const ps = presets(); const sel = $("#perPreset");
  const cur = ps.find(p => p[0] === P.preset);
  if (!cur || (cur[0] !== "custom" && (cur[2] !== P.from || cur[3] !== P.to))) P.preset = "custom";
  sel.innerHTML = ps.map(p => `<option value="${esc(p[0])}" ${p[0] === P.preset ? "selected" : ""}>${esc(p[1])}</option>`).join("");
  $("#perFrom").value = P.from; $("#perTo").value = P.to;
}
function setPeriod(from, to, preset) {
  if (!from || !to) return; if (from > to) [from, to] = [to, from];
  Object.assign(P, { from, to, preset: preset || "custom" });
  try { localStorage.setItem("gestaoAgroERP.periodo", JSON.stringify(P)); } catch (e) { }
  syncPeriodUI(); render(false);
}

/* ---------- toast / modal / confirmação ---------- */
function toast(msg, bad) { const t = document.createElement("div"); t.className = "toast" + (bad ? " bad" : ""); t.textContent = msg; t.setAttribute("role", "status"); document.body.appendChild(t); setTimeout(() => t.remove(), bad ? 5000 : 2600); }
function closeModal() { $("#modalRoot").innerHTML = ""; document.body.style.overflow = ""; }
function openModal(title, body, foot, wide) {
  $("#modalRoot").innerHTML = `<div class="modal-bg" id="mbg"><div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-h"><h3>${esc(title)}</h3><button class="btn ghost sm" data-close aria-label="Fechar">✕</button></div><div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ""}</div></div>`;
  document.body.style.overflow = "hidden";
  $("#mbg").addEventListener("mousedown", ev => { if (ev.target.id === "mbg") closeModal(); });
  $$("[data-close]", $("#modalRoot")).forEach(b => b.onclick = closeModal);
  const first = $(".modal-b input:not([type=checkbox]):not([disabled]), .modal-b select:not([disabled])", $("#modalRoot")); if (first) setTimeout(() => first.focus(), 30);
  return $(".modal", $("#modalRoot"));
}
function confirmBox(msg, ok = "Excluir", danger = true) {
  return new Promise(res => {
    const m = openModal("Confirmar", `<p style="margin:0">${msg}</p>`, `<button class="btn" data-no>Cancelar</button><button class="btn ${danger ? "danger" : "pri"}" data-yes>${esc(ok)}</button>`);
    $("[data-no]", m).onclick = () => { closeModal(); res(false); };
    $("[data-yes]", m).onclick = () => { closeModal(); res(true); };
  });
}
document.addEventListener("keydown", ev => { if (ev.key === "Escape" && $("#modalRoot").innerHTML) closeModal(); });

/* ---------- formulários genéricos ---------- */
const opt = (list, val, empty) => (empty !== undefined ? `<option value="">${esc(empty)}</option>` : "") + list.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val ?? "") ? "selected" : ""}>${esc(l)}</option>`).join("");
const optCulturas = () => all("culturas").sort((a, b) => a.nome.localeCompare(b.nome)).map(c => [c.id, c.nome]);
const optTalhoes = (inclInat) => all("talhoes").filter(t => inclInat || t.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })).map(t => [t.id, `${t.nome} · ${nf(num(t.area), 1)} ha · ${(get("culturas", t.culturaId) || {}).nome || "sem cultura"}`]);
const optSafras = () => E().safras.slice().reverse().map(s => [s.id, s.nome]);
const optCategorias = (filter) => { const cs = all("categorias").filter(filter || (() => true)); return Object.keys(GRUPOS).flatMap(g => cs.filter(c => c.grupo === g).sort((a, b) => a.nome.localeCompare(b.nome)).map(c => [c.id, GRUPOS[g].nome + " › " + c.nome])); };
const optInsumos = () => all("insumos").sort((a, b) => a.nome.localeCompare(b.nome)).map(i => [i.id, `${i.nome} (${i.unidade})`]);
const optContratos = () => all("contratos").map(c => [c.id, `${c.banco} · ${c.linha || ""}`]);

function fieldHTML(f, d) {
  const v = d[f.k]; const id = "f_" + f.k; const span = f.span ? "s" + f.span : ""; const dis = f.disabled ? "disabled" : "";
  if (f.t === "sec") return `<div class="fsec" data-wrap="${esc(f.k || "")}">${esc(f.l)}</div>`;
  if (f.t === "calc") return `<div class="f ${span}" data-wrap="${f.k}"><label>${esc(f.l)}</label><div class="hint" id="${id}" data-calc="${f.k}"></div></div>`;
  if (f.t === "html") return `<div class="f ${span}" data-wrap="${f.k}">${f.html}</div>`;
  let ctl;
  if (f.t === "sel") ctl = `<select class="inp" id="${id}" name="${f.k}" ${dis}>${opt(typeof f.opts === "function" ? f.opts(d) : f.opts, v, f.empty)}</select>`;
  else if (f.t === "area") ctl = `<textarea class="inp" id="${id}" name="${f.k}" ${dis}>${esc(v)}</textarea>`;
  else if (f.t === "chk") return `<div class="f ${span}" data-wrap="${f.k}"><label>&nbsp;</label><label class="chk"><input type="checkbox" id="${id}" name="${f.k}" ${v ? "checked" : ""} ${dis}> ${esc(f.l)}</label>${f.help ? `<small>${esc(f.help)}</small>` : ""}</div>`;
  else ctl = `<input class="inp" id="${id}" name="${f.k}" type="${f.t === "num" ? "text" : (f.t || "text")}" ${f.t === "num" ? 'inputmode="decimal"' : ""} value="${esc(f.t === "num" && v !== "" && v != null ? String(v).replace(".", ",") : (v ?? ""))}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ""} ${dis}>`;
  return `<div class="f ${span}" data-wrap="${f.k}"><label for="${id}">${esc(f.l)}${f.req ? ' <span class="req">*</span>' : ""}</label>${ctl}${f.help ? `<small>${esc(f.help)}</small>` : ""}</div>`;
}
function readForm(root, fields) {
  const o = {};
  fields.forEach(f => { if (!f.k || ["sec", "calc", "html"].includes(f.t)) return; const el = $(`[name="${f.k}"]`, root); if (!el) return; o[f.k] = f.t === "chk" ? el.checked : f.t === "num" ? (el.value.trim() === "" ? "" : num(el.value)) : el.value.trim(); });
  return o;
}
/* openForm: título, campos, dados, onSave(vals) -> true/mensagem de erro */
function openForm({ title, fields, data = {}, onSave, onDelete, wide, saveLabel = "Salvar", note }) {
  const body = `${note ? `<div class="hint">${note}</div>` : ""}<form class="form" id="frm" autocomplete="off">${fields.map(f => fieldHTML(f, data)).join("")}</form><div class="err" id="frmErr" role="alert"></div>`;
  const foot = `${onDelete ? `<button class="btn danger" data-del style="margin-right:auto">${ico("trash")} Excluir</button>` : ""}<button class="btn" data-close>Cancelar</button><button class="btn pri" data-save>${esc(saveLabel)}</button>`;
  const m = openModal(title, body, foot, wide); const frm = $("#frm", m);
  const refresh = () => {
    const vals = { ...data, ...readForm(frm, fields) };
    fields.forEach(f => { if (f.show) { const w = $(`[data-wrap="${f.k}"]`, frm); if (w) w.hidden = !f.show(vals); } if (f.t === "calc") { const el = $(`[data-calc="${f.k}"]`, frm); if (el) el.innerHTML = f.calc(vals); } });
  };
  frm.addEventListener("input", refresh); frm.addEventListener("change", ev => { const f = fields.find(x => x.k === ev.target.name); if (f && f.onchange) f.onchange(frm, { ...data, ...readForm(frm, fields) }); refresh(); });
  refresh();
  frm.addEventListener("submit", ev => { ev.preventDefault(); $("[data-save]", m).click(); });
  $("[data-save]", m).onclick = async () => {
    const vals = readForm(frm, fields); const miss = fields.filter(f => f.req && (!f.show || f.show({ ...data, ...vals })) && (vals[f.k] === "" || vals[f.k] == null));
    if (miss.length) { $("#frmErr").textContent = "Preencha: " + miss.map(f => f.l).join(", ") + "."; return; }
    if (!Store.canWrite) { $("#frmErr").textContent = "Seu acesso é somente leitura."; return; }
    const btn = $("[data-save]", m); btn.disabled = true;
    try { const r = await onSave({ ...data, ...vals }); if (r && r !== true) { $("#frmErr").textContent = r; btn.disabled = false; return; } closeModal(); toast("Registro salvo"); }
    catch (e) { console.error(e); $("#frmErr").textContent = "Não foi possível salvar. " + (e && e.message ? e.message : ""); btn.disabled = false; }
  };
  if (onDelete) $("[data-del]", m).onclick = async () => { const ok = await confirmBox("Excluir este registro? Esta ação não pode ser desfeita."); if (!ok) return; try { const r = await onDelete(data); if (r && r !== true) { toast(r, true); return; } toast("Registro excluído"); } catch (e) { toast("Não foi possível excluir.", true); } };
  return m;
}

/* ---------- tabelas e exportação ---------- */
const CSV = new Map();
function table(cols, rows, { id, empty = "Nenhum registro no período.", cls = "", foot, rowAttr } = {}) {
  if (id) CSV.set(id, { cols, rows, foot });
  if (!rows.length) return `<div class="empty"><b>${esc(empty)}</b></div>`;
  const th = cols.map(c => `<th class="${c.n ? "n" : ""}">${esc(c.h)}</th>`).join("");
  const body = rows.map(r => `<tr ${rowAttr ? rowAttr(r) : ""} class="${r._cls || ""}">${cols.map(c => `<td class="${c.n ? "n" : ""} ${c.cls || ""}">${c.f(r)}</td>`).join("")}</tr>`).join("");
  const tf = foot ? `<tr class="sum">${cols.map(c => `<td class="${c.n ? "n" : ""}">${c.foot ? c.foot(foot) : ""}</td>`).join("")}</tr>` : "";
  return `<div class="tw"><table class="t ${cls}"><thead><tr>${th}</tr></thead><tbody>${body}${tf}</tbody></table></div>`;
}
const csvBtn = (id, name) => `<button class="btn sm" data-csv="${esc(id)}" data-name="${esc(name)}" title="Exportar tabela em CSV">${ico("dl")} CSV</button>`;
const stripHtml = h => { const d = document.createElement("div"); d.innerHTML = h; return d.textContent.trim(); };
async function exportCSV(id, name) {
  const t = CSV.get(id); let data;
  if (t) {
    const lines = [t.cols.map(c => c.h)].concat(t.rows.map(r => t.cols.map(c => stripHtml(String(c.f(r))))));
    if (t.foot) lines.push(t.cols.map(c => c.foot ? stripHtml(String(c.foot(t.foot))) : ""));
    data = lines;
  } else { const tb = document.querySelector(`[data-table="${id}"] table`); if (!tb) return; data = $$("tr", tb).map(tr => $$("th,td", tr).map(td => td.textContent.trim())); }
  const csv = "﻿" + data.map(r => r.map(x => /[;"\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x).join(";")).join("\r\n");
  await saveFile((name || id) + ".csv", csv);
}
async function saveFile(filename, data) {
  let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (e) { }
  if (dl) { try { await dl.save({ filename, data }); } catch (e) { if (e && e.code !== "cancelled") toast("Download não concluído.", true); } return; }
  try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: "text/plain;charset=utf-8" })); a.download = filename; a.click(); } catch (e) { toast("Download indisponível nesta visualização.", true); }
}

/* ---------- gráficos SVG ---------- */
const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)", "var(--s8)"];
function niceScale(min, max, ticks = 5) {
  if (min === max) { max = min + 1; }
  const span = max - min; const step0 = span / ticks; const mag = Math.pow(10, Math.floor(Math.log10(step0))); const f = step0 / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step; const out = []; for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(10));
  return out;
}
const tipAttr = (title, rows) => `data-tip="${esc(`<b>${esc(title)}</b>` + rows.map(([l, v]) => `<div class="r"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join(""))}"`;
function legend(series, line) { return series.length > 1 ? `<div class="legend">${series.map((s, i) => `<span><i class="${s.line ? "ln" : ""}" style="background:${s.color || SERIES[i]}"></i>${esc(s.name)}</span>`).join("")}</div>` : ""; }
/* barras verticais agrupadas; séries com line:true são desenhadas como linha na mesma escala */
function barChart({ labels, series, height = 230, fmt = brl0 }) {
  if (!labels.length) return `<div class="empty"><b>Sem dados no período.</b></div>`;
  const W = innerWidth < 640 ? 420 : 720, H = innerWidth < 640 ? Math.round(height * 0.8) : height, L = 52, R = 10, T = 10, B = 26;
  const vals = series.flatMap(s => s.values); const ticks = niceScale(Math.min(0, ...vals), Math.max(0, ...vals));
  const lo = ticks[0], hi = ticks[ticks.length - 1]; const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo || 1));
  const bw = (W - L - R) / labels.length; const bars = series.filter(s => !s.line); const gap = 2; const inner = Math.min(38, (bw * 0.72));
  const each = bars.length ? (inner - gap * (bars.length - 1)) / bars.length : 0;
  let g = ticks.map(t => `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${esc(kfmt(t))}</text>`).join("");
  g += `<line class="ax" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>`;
  const step = Math.ceil(labels.length / (W < 500 ? 6 : 12));
  labels.forEach((lb, i) => {
    const cx = L + bw * i + bw / 2;
    if (i % step === 0) g += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(lb)}</text>`;
    bars.forEach((s, j) => {
      const v = s.values[i] || 0; const x = cx - inner / 2 + j * (each + gap); const y0 = y(0), y1 = y(v); const h = Math.abs(y1 - y0); if (h < 0.5) return;
      const top = Math.min(y0, y1); const r = Math.min(4, each / 2, h);
      const d = v >= 0 ? `M${x},${y0}V${top + r}Q${x},${top} ${x + r},${top}H${x + each - r}Q${x + each},${top} ${x + each},${top + r}V${y0}Z` : `M${x},${y0}V${top + h - r}Q${x},${top + h} ${x + r},${top + h}H${x + each - r}Q${x + each},${top + h} ${x + each},${top + h - r}V${y0}Z`;
      g += `<path d="${d}" fill="${s.color || SERIES[series.indexOf(s)]}"/>`;
    });
    g += `<rect x="${L + bw * i}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent" ${tipAttr(lb, series.map(s => [s.name, fmt(s.values[i] || 0)]))}/>`;
  });
  series.filter(s => s.line).forEach(s => {
    const pts = s.values.map((v, i) => [L + bw * i + bw / 2, y(v || 0)]);
    g += `<polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" pointer-events="none"/>`;
    g += pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${s.color}" stroke="var(--surface)" stroke-width="2" pointer-events="none"/>`).join("");
  });
  return `${legend(series)}<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map(s => s.name).join(", "))}">${g}</svg></div>`;
}
function hbars(rows, fmt = brl0, { max } = {}) {
  if (!rows.length) return `<div class="empty"><b>Sem dados no período.</b></div>`;
  const m = max || Math.max(...rows.map(r => Math.abs(r.value)), 1);
  return `<div class="hbar">${rows.map((r, i) => `<div class="row" ${tipAttr(r.label, [["Valor", fmt(r.value)]].concat(r.extra || []))}><span class="lb" title="${esc(r.label)}">${esc(r.label)}</span><div class="track"><div class="bar" style="width:${Math.max(0.5, Math.abs(r.value) / m * 100)}%;background:${r.color || "var(--s1)"}"></div></div><span class="val">${esc(r.txt || fmt(r.value))}</span></div>`).join("")}</div>`;
}
document.addEventListener("mousemove", ev => {
  const t = ev.target.closest && ev.target.closest("[data-tip]"); const tip = $("#tip");
  if (!t) { tip.hidden = true; return; }
  tip.innerHTML = t.getAttribute("data-tip"); tip.hidden = false;
  const w = tip.offsetWidth, h = tip.offsetHeight; let x = ev.clientX + 14, y = ev.clientY + 14;
  if (x + w > innerWidth - 8) x = ev.clientX - w - 14; if (y + h > innerHeight - 8) y = ev.clientY - h - 14;
  tip.style.left = x + "px"; tip.style.top = y + "px";
});

/* ---------- ligação de eventos por delegação ---------- */
const ACTIONS = {};
function bindView() {
  $$("[data-csv]").forEach(b => b.onclick = () => exportCSV(b.dataset.csv, b.dataset.name));
  $$("[data-act]").forEach(b => { const fn = ACTIONS[b.dataset.act]; if (fn) b.addEventListener(b.tagName === "SELECT" || b.tagName === "INPUT" ? "change" : "click", ev => { ev.stopPropagation(); fn(b.dataset.id, b, ev); }); });
}
const kpi = (l, v, d, cls = "") => `<div class="kpi ${cls}"><span class="l">${esc(l)}</span><span class="v">${v}</span>${d ? `<span class="d">${d}</span>` : ""}</div>`;
const panel = (title, body, { sub, tools = "", flush } = {}) => `<section class="panel"><div class="panel-h"><h2>${esc(title)}${sub ? `<span class="sub">${sub}</span>` : ""}</h2>${tools}</div><div class="panel-b ${flush ? "flush" : ""}">${body}</div></section>`;
const pill = (txt, cls = "") => `<span class="pill ${cls}">${esc(txt)}</span>`;
const periodTxt = () => `${fmtD(P.from)} a ${fmtD(P.to)}`;
const nomeCult = id => (get("culturas", id) || {}).nome || "—";
const nomeTal = id => (get("talhoes", id) || {}).nome || "—";
const nomeSafra = id => (get("safras", id) || {}).nome || "—";
const nomeCat = id => (get("categorias", id) || {}).nome || "—";
const unCult = id => (get("culturas", id) || {}).unidade || "un";
const UNID_NOME = { sc: "sacas de 60 kg", kg: "kg", t: "toneladas", "@": "arrobas" };
/* ================= OPERAÇÕES ================= */

/* ---------- Lançamentos (contas a pagar e receber) ---------- */
const LF = { tipo: "todos", status: "todos", q: "", base: "venc" };
function lancForm(l = {}) {
  const novo = !l.id; const sistema = l.origem && l.origem !== "manual";
  const d = Object.assign({ competencia: today(), vencimento: today(), pagamento: "", pago: false, repetir: 1 }, l, { pago: !!l.pagamento });
  const catGrupo = v => (get("categorias", v.categoriaId) || {}).grupo;
  const fields = [
    { k: "categoriaId", l: "Conta do plano de contas", t: "sel", opts: optCategorias(c => !c.sistema || c.id === l.categoriaId), req: true, span: 4, empty: "Selecione…", disabled: sistema },
    { k: "valor", l: "Valor (R$)", t: "num", req: true, disabled: sistema },
    { k: "descricao", l: "Descrição / histórico", span: 4, req: true, disabled: sistema },
    { k: "contraparte", l: "Fornecedor / cliente" },
    { k: "competencia", l: "Data de competência", t: "date", req: true, disabled: sistema, help: "Mês em que o fato ocorreu (DRE)" },
    { k: "vencimento", l: "Vencimento", t: "date", req: true },
    { k: "documento", l: "Documento / NF" },
    { k: "pago", l: "Já foi pago / recebido", t: "chk" },
    { k: "pagamento", l: "Data do pagamento", t: "date", show: v => v.pago },
    { k: "sec1", l: "Apropriação (centro de custo)", t: "sec", show: v => ["custo", "receita", "deducao", "comercial"].includes(catGrupo(v)) },
    { k: "talhaoId", l: "Talhão", t: "sel", opts: optTalhoes(true), empty: "Rateio por área / não se aplica", span: 3, show: v => ["custo"].includes(catGrupo(v)), disabled: sistema },
    { k: "culturaId", l: "Cultura", t: "sel", opts: optCulturas(), empty: "—", show: v => ["custo", "receita", "deducao", "comercial"].includes(catGrupo(v)), disabled: sistema },
    { k: "safraId", l: "Safra", t: "sel", opts: optSafras(), empty: "Pela data", show: v => ["custo", "receita", "deducao", "comercial"].includes(catGrupo(v)), disabled: sistema },
    { k: "qtd", l: "Quantidade vendida", t: "num", show: v => catGrupo(v) === "receita", disabled: sistema, help: "Na unidade da cultura; baixa o estoque de produto" },
    { k: "contratoId", l: "Contrato de financiamento", t: "sel", opts: optContratos(), empty: "—", span: 3, show: v => ["captacao", "amortizacao", "desp_fin"].includes(catGrupo(v)) },
    { k: "repetir", l: "Repetir mensalmente (nº de vezes)", t: "num", show: () => novo, help: "Gera parcelas mensais iguais (ex.: salários, arrendamento)" },
    { k: "obs", l: "Observações", t: "area", span: 6 }
  ];
  openForm({
    title: novo ? "Novo lançamento" : "Editar lançamento", data: d, fields,
    note: sistema ? `Lançamento gerado automaticamente por ${esc({ venda: "uma venda", compra: "uma compra de insumo", ativo: "um bem do patrimônio", contrato: "um contrato de financiamento" }[l.origem] || "outro módulo")}. Valor, conta e competência são alterados na origem; aqui você registra vencimento e pagamento.` : "",
    onSave: async v => {
      if (num(v.valor) <= 0) return "Informe um valor maior que zero.";
      if (v.pago && !v.pagamento) v.pagamento = today();
      if (!v.pago) v.pagamento = "";
      const rep = Math.max(1, Math.min(120, Math.round(num(v.repetir) || 1)));
      const base = { ...v }; delete base.pago; delete base.repetir; if (!base.origem) base.origem = "manual";
      base.valor = num(base.valor); if (base.qtd !== undefined) base.qtd = num(base.qtd);
      if (novo && rep > 1) {
        const ops = []; for (let i = 0; i < rep; i++) ops.push({ op: "put", col: "lancamentos", obj: { ...base, id: uid("l"), descricao: `${base.descricao} (${i + 1}/${rep})`, competencia: addMonths(base.competencia, i), vencimento: addMonths(base.vencimento, i), pagamento: i === 0 ? base.pagamento : "", criado: new Date().toISOString() } });
        await Store.bulk(ops);
      } else { if (novo) base.criado = new Date().toISOString(); await Store.put("lancamentos", base); }
      return true;
    },
    onDelete: novo ? null : async () => {
      if (sistema) return "Este lançamento pertence a outro módulo. Exclua a venda, compra, bem ou contrato de origem.";
      await Store.del("lancamentos", l.id); closeModal();
    }
  });
}
ACTIONS["lanc-novo"] = () => lancForm();
ACTIONS["lanc-edit"] = id => lancForm(get("lancamentos", id));
ACTIONS["lanc-baixar"] = async id => { const l = get("lancamentos", id); if (!l) return; await Store.put("lancamentos", { ...l, pagamento: today() }); toast("Baixa registrada em " + fmtD(today())); };
ACTIONS["lf-tipo"] = (_, el) => { LF.tipo = el.value; render(); };
ACTIONS["lf-status"] = (_, el) => { LF.status = el.value; render(); };
ACTIONS["lf-base"] = (_, el) => { LF.base = el.value; render(); };
ACTIONS["lf-q"] = (_, el) => { LF.q = el.value; render(); setTimeout(() => { const i = $("#lfq"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0); };

route("lancamentos", "Contas a pagar e receber", () => {
  const e = E(); const dateOf = l => LF.base === "venc" ? (l.vencimento || l.competencia) : LF.base === "comp" ? l.competencia : (l.pagamento || "");
  let ls = e.lancs.filter(l => { const d = dateOf(l); return d >= P.from && d <= P.to; });
  if (LF.tipo !== "todos") ls = ls.filter(l => { const g = GRUPOS[e.grupoOf(l.categoriaId)]; return LF.tipo === "R" ? g && g.dir > 0 : !g || g.dir < 0; });
  if (LF.status !== "todos") ls = ls.filter(l => statusLanc(l) === LF.status);
  if (LF.q) { const q = LF.q.toLowerCase(); ls = ls.filter(l => [l.descricao, l.contraparte, l.documento, nomeCat(l.categoriaId)].join(" ").toLowerCase().includes(q)); }
  ls.sort((a, b) => dateOf(a) < dateOf(b) ? -1 : dateOf(a) > dateOf(b) ? 1 : 0);
  const rec = ls.filter(l => signedVal(l) > 0), pag = ls.filter(l => signedVal(l) < 0);
  const aberto = x => sum(x.filter(l => !l.pagamento), l => num(l.valor));
  const venc = sum(e.lancs.filter(l => statusLanc(l) === "vencido" && signedVal(l) < 0), l => num(l.valor));
  const vencR = sum(e.lancs.filter(l => statusLanc(l) === "vencido" && signedVal(l) > 0), l => num(l.valor));
  const st = l => { const s = statusLanc(l); return s === "pago" ? pill(signedVal(l) > 0 ? "Recebido" : "Pago", "good") : s === "vencido" ? pill("Vencido", "bad") : pill("Em aberto", "warn"); };
  const cols = [
    { h: "Vencimento", f: l => fmtD(l.vencimento || l.competencia) },
    { h: "Competência", f: l => fmtD(l.competencia) },
    { h: "Descrição", f: l => `<b>${esc(l.descricao)}</b>${l.contraparte ? `<div class="note">${esc(l.contraparte)}</div>` : ""}`, cls: "wrap" },
    { h: "Conta", f: l => `${esc(nomeCat(l.categoriaId))}<div class="note">${esc((GRUPOS[e.grupoOf(l.categoriaId)] || {}).nome || "")}</div>`, cls: "wrap" },
    { h: "Valor", n: 1, f: l => `<span class="${signedVal(l) < 0 ? "neg" : "pos"}">${brl(signedVal(l))}</span>` },
    { h: "Situação", f: l => st(l) + (l.pagamento ? `<div class="note">${fmtD(l.pagamento)}</div>` : "") },
    { h: "", f: l => `<span class="acts">${!l.pagamento ? `<button class="btn sm" data-act="lanc-baixar" data-id="${l.id}" title="Registrar pagamento hoje">${ico("check")} Baixar</button>` : ""} <button class="btn sm ghost" data-act="lanc-edit" data-id="${l.id}" aria-label="Editar">${ico("edit")}</button></span>`, cls: "acts" }
  ];
  return `<div class="kpis">
    ${kpi("A receber no filtro", brl0(aberto(rec)), `${rec.filter(l => !l.pagamento).length} títulos em aberto`)}
    ${kpi("A pagar no filtro", brl0(aberto(pag)), `${pag.filter(l => !l.pagamento).length} títulos em aberto`)}
    ${kpi("Pagamentos vencidos", brl0(venc), venc > 0 ? pill("Exige atenção", "bad") : pill("Em dia", "good"))}
    ${kpi("Recebimentos atrasados", brl0(vencR), vencR > 0 ? pill("Cobrar", "warn") : pill("Em dia", "good"))}
    ${kpi("Saldo de caixa hoje", brl0(caixaEm(today())), "Bancos e caixa")}
  </div>
  ${panel("Títulos", table(cols, ls, { id: "lancamentos", empty: "Nenhum lançamento encontrado com esses filtros." }), {
    sub: `${ls.length} lançamentos · ${periodTxt()} por ${LF.base === "venc" ? "vencimento" : LF.base === "comp" ? "competência" : "pagamento"}`, flush: true,
    tools: `<div class="toolbar">
      <input class="inp sm" id="lfq" placeholder="Buscar descrição, fornecedor, NF…" value="${esc(LF.q)}" data-act="lf-q" aria-label="Buscar">
      <select class="inp sm" data-act="lf-tipo" aria-label="Tipo">${opt([["todos", "Pagar e receber"], ["R", "Somente a receber"], ["P", "Somente a pagar"]], LF.tipo)}</select>
      <select class="inp sm" data-act="lf-status" aria-label="Situação">${opt([["todos", "Todas as situações"], ["aberto", "Em aberto"], ["vencido", "Vencidos"], ["pago", "Pagos / recebidos"]], LF.status)}</select>
      <select class="inp sm" data-act="lf-base" aria-label="Data base">${opt([["venc", "Por vencimento"], ["comp", "Por competência"], ["pag", "Por pagamento"]], LF.base)}</select>
      ${csvBtn("lancamentos", "lancamentos")}
      <button class="btn pri sm" data-act="lanc-novo">${ico("plus")} Novo lançamento</button></div>`
  })}`;
}, { period: true });

/* ---------- Vendas ---------- */
function estoqueProdutoDisp(culturaId, safraId, exceptId) {
  const e = E(); const colh = sum(e.colheitas.filter(h => h.culturaId === culturaId && h.safraId === safraId), h => h.qtd);
  const vend = sum(e.vendas.filter(v => v.culturaId === culturaId && v.safraId === safraId && v.id !== exceptId), v => v.qtd); return colh - vend;
}
function vendaForm(v0) {
  const novo = !v0; let warned = false; const C = cfg();
  const ded = v0 ? all("lancamentos").filter(l => l.vendaId === v0.vendaId && l.id !== v0.id) : [];
  const fun = ded.find(l => l.categoriaId === "c_funrural"), icms = ded.find(l => l.categoriaId === "c_icms"), frete = ded.find(l => l.categoriaId === "c_frete");
  const d = v0 ? { culturaId: v0.culturaId, safraId: v0.safraId, qtd: v0.qtd, preco: num(v0.valor) / (num(v0.qtd) || 1), competencia: v0.competencia, vencimento: v0.vencimento, recebido: !!v0.pagamento, pagamento: v0.pagamento, contraparte: v0.contraparte, documento: v0.documento, obs: v0.obs, funPct: fun ? +(num(fun.valor) / num(v0.valor) * 100).toFixed(3) : 0, icmsPct: icms ? +(num(icms.valor) / num(v0.valor) * 100).toFixed(3) : 0, frete: frete ? num(frete.valor) : 0, contrato: v0.contrato || "" }
    : { competencia: today(), vencimento: today(), funPct: num(C.funruralPct), icmsPct: 0, frete: 0, recebido: false, safraId: E().safraOf(today()) };
  openForm({
    title: novo ? "Registrar venda" : "Editar venda", data: d,
    fields: [
      { k: "culturaId", l: "Produto (cultura)", t: "sel", opts: optCulturas(), empty: "Selecione…", req: true },
      { k: "safraId", l: "Safra de origem do produto", t: "sel", opts: optSafras(), empty: "Selecione…", req: true },
      { k: "disp", l: "Estoque disponível", t: "calc", calc: v => v.culturaId && v.safraId ? `<b>${nf(estoqueProdutoDisp(v.culturaId, v.safraId, v0 && v0.id), 1)}</b> ${esc(unCult(v.culturaId))} em estoque desta safra` : "Escolha cultura e safra" },
      { k: "qtd", l: "Quantidade", t: "num", req: true },
      { k: "preco", l: "Preço por unidade (R$)", t: "num", req: true },
      { k: "total", l: "Valor bruto", t: "calc", calc: v => `<b>${brl(num(v.qtd) * num(v.preco))}</b>` },
      { k: "competencia", l: "Data da venda", t: "date", req: true },
      { k: "vencimento", l: "Vencimento do recebimento", t: "date", req: true },
      { k: "contraparte", l: "Comprador", req: true },
      { k: "recebido", l: "Já recebido", t: "chk" },
      { k: "pagamento", l: "Data do recebimento", t: "date", show: v => v.recebido },
      { k: "documento", l: "Nota fiscal / contrato" },
      { k: "s2", l: "Deduções e despesas da venda", t: "sec" },
      { k: "funPct", l: "Funrural / Senar (%)", t: "num", help: "Retido pelo comprador na data do recebimento" },
      { k: "icmsPct", l: "ICMS (%)", t: "num", help: "Vence no dia 20 do mês seguinte" },
      { k: "frete", l: "Frete por conta do vendedor (R$)", t: "num" },
      { k: "liq", l: "Resumo", t: "calc", span: 6, calc: v => { const b = num(v.qtd) * num(v.preco); const f = b * num(v.funPct) / 100, i = b * num(v.icmsPct) / 100; return `Receita bruta ${brl(b)} · Funrural ${brl(f)} · ICMS ${brl(i)} · Frete ${brl(num(v.frete))} · <b>Líquido da venda ${brl(b - f - i - num(v.frete))}</b>`; } },
      { k: "obs", l: "Observações (classificação, tipo, bebida…)", t: "area", span: 6 }
    ],
    onSave: async v => {
      if (num(v.qtd) <= 0 || num(v.preco) <= 0) return "Quantidade e preço devem ser maiores que zero.";
      const disp = estoqueProdutoDisp(v.culturaId, v.safraId, v0 && v0.id);
      if (num(v.qtd) > disp + 1e-6 && !warned) { warned = true; return `A quantidade supera o estoque colhido desta safra (${nf(disp, 1)} ${unCult(v.culturaId)}). Clique em Salvar novamente para registrar como venda antecipada.`; }
      const vendaId = v0 ? v0.vendaId : uid("v"); const bruto = num(v.qtd) * num(v.preco); const pg = v.recebido ? (v.pagamento || today()) : "";
      const cultN = nomeCult(v.culturaId); const now = new Date().toISOString();
      const ops = [];
      const main = { id: v0 ? v0.id : uid("l"), categoriaId: "c_venda", descricao: `Venda de ${cultN} – ${nf(num(v.qtd), 1)} ${unCult(v.culturaId)}`, valor: bruto, competencia: v.competencia, vencimento: v.vencimento, pagamento: pg, contraparte: v.contraparte, documento: v.documento, culturaId: v.culturaId, safraId: v.safraId, qtd: num(v.qtd), obs: v.obs, origem: "venda", vendaId, criado: v0 ? v0.criado : now };
      ops.push({ op: "put", col: "lancamentos", obj: main });
      ded.forEach(l => ops.push({ op: "del", col: "lancamentos", id: l.id }));
      if (num(v.funPct) > 0) ops.push({ op: "put", col: "lancamentos", obj: { id: uid("l"), categoriaId: "c_funrural", descricao: `Funrural retido – venda de ${cultN}`, valor: bruto * num(v.funPct) / 100, competencia: v.competencia, vencimento: v.vencimento, pagamento: pg, contraparte: v.contraparte, culturaId: v.culturaId, safraId: v.safraId, origem: "venda", vendaId, criado: now } });
      if (num(v.icmsPct) > 0) { const vc = monthStart(addMonths(v.competencia, 1)).slice(0, 8) + "20"; ops.push({ op: "put", col: "lancamentos", obj: { id: uid("l"), categoriaId: "c_icms", descricao: `ICMS – venda de ${cultN}`, valor: bruto * num(v.icmsPct) / 100, competencia: v.competencia, vencimento: vc, pagamento: "", contraparte: "Secretaria da Fazenda", culturaId: v.culturaId, safraId: v.safraId, origem: "venda", vendaId, criado: now } }); }
      if (num(v.frete) > 0) ops.push({ op: "put", col: "lancamentos", obj: { id: uid("l"), categoriaId: "c_frete", descricao: `Frete – venda de ${cultN}`, valor: num(v.frete), competencia: v.competencia, vencimento: v.competencia, pagamento: v.competencia <= today() ? v.competencia : "", contraparte: "Transportadora", culturaId: v.culturaId, safraId: v.safraId, origem: "venda", vendaId, criado: now } });
      await Store.bulk(ops); return true;
    },
    onDelete: novo ? null : async () => { const ops = all("lancamentos").filter(l => l.vendaId === v0.vendaId).map(l => ({ op: "del", col: "lancamentos", id: l.id })); await Store.bulk(ops); closeModal(); }
  });
}
ACTIONS["venda-nova"] = () => vendaForm();
ACTIONS["venda-edit"] = id => { const l = get("lancamentos", id); if (l && l.origem === "venda") vendaForm(l); else lancForm(l); };

route("vendas", "Vendas", () => {
  const e = E(); const vs = e.vendas.filter(v => v.competencia >= P.from && v.competencia <= P.to).sort((a, b) => a.competencia < b.competencia ? 1 : -1);
  const dedOf = v => sum(all("lancamentos").filter(l => l.vendaId && l.vendaId === v.vendaId && l.id !== v.id), l => num(l.valor));
  const porCult = [...groupBy(vs, v => v.culturaId).entries()].map(([c, a]) => ({ c, q: sum(a, x => x.qtd), v: sum(a, x => x.valor), cmv: sum(a, x => x.cmv) }));
  const cols = [
    { h: "Data", f: v => fmtD(v.competencia) }, { h: "Produto", f: v => `<b>${esc(nomeCult(v.culturaId))}</b><div class="note">Safra ${esc(nomeSafra(v.safraId))}</div>` },
    { h: "Comprador", f: v => esc(v.contraparte || "—"), cls: "wrap" }, { h: "Quantidade", n: 1, f: v => `${nf(v.qtd, 1)} ${esc(unCult(v.culturaId))}` },
    { h: "Preço médio", n: 1, f: v => brl(v.valor / v.qtd) }, { h: "Receita bruta", n: 1, f: v => brl(v.valor) }, { h: "Deduções e frete", n: 1, f: v => brl(-dedOf(v)) },
    { h: "Custo (CMV)", n: 1, f: v => brl(-v.cmv) }, { h: "Margem bruta", n: 1, f: v => `<span class="${signCls(v.valor - dedOf(v) - v.cmv)}">${brl(v.valor - dedOf(v) - v.cmv)}</span>` },
    { h: "Recebimento", f: v => v.pagamento ? pill("Recebido", "good") : statusLanc(v) === "vencido" ? pill("Atrasado", "bad") : pill("A receber " + fmtD(v.vencimento), "warn") },
    { h: "", cls: "acts", f: v => `<button class="btn sm ghost" data-act="venda-edit" data-id="${v.id}" aria-label="Editar">${ico("edit")}</button>` }
  ];
  const prodRows = [...e.cs.values()].filter(o => o.colhido > 0 || o.vendido > 0).map(o => ({ ...o, saldo: o.colhido - o.vendido, c: get("culturas", o.culturaId) || {} })).sort((a, b) => nomeSafra(b.safraId).localeCompare(nomeSafra(a.safraId)));
  return `<div class="kpis">${porCult.map(p => kpi(nomeCult(p.c), brl0(p.v), `${nf(p.q, 1)} ${esc(unCult(p.c))} · média ${brl(p.v / p.q)}/${esc(unCult(p.c))}`)).join("") || kpi("Vendas no período", brl0(0), "Nenhuma venda registrada")}</div>
  ${panel("Vendas do período", table(cols, vs, { id: "vendas", empty: "Nenhuma venda no período." }), { sub: periodTxt(), flush: true, tools: `<div class="toolbar">${csvBtn("vendas", "vendas")}<button class="btn pri sm" data-act="venda-nova">${ico("plus")} Registrar venda</button></div>` })}
  ${panel("Estoque de produtos agrícolas", table([
    { h: "Produto", f: o => `<b>${esc(o.c.nome || "—")}</b>` }, { h: "Safra", f: o => esc(nomeSafra(o.safraId)) },
    { h: "Colhido", n: 1, f: o => nf(o.colhido, 1) }, { h: "Vendido", n: 1, f: o => nf(o.vendido, 1) }, { h: "Saldo", n: 1, f: o => `<b>${nf(o.saldo, 1)}</b> ${esc(o.c.unidade || "")}` },
    { h: "Custo unitário", n: 1, f: o => brl(o.cu) }, { h: "Valor a custo", n: 1, f: o => brl(o.saldo * o.cu) },
    { h: "Preço de referência", n: 1, f: o => brl(num(o.c.precoRef)) }, { h: "Valor de mercado", n: 1, f: o => brl(o.saldo * num(o.c.precoRef)) },
    { h: "Margem potencial", n: 1, f: o => `<span class="${signCls(o.saldo * (num(o.c.precoRef) - o.cu))}">${brl(o.saldo * (num(o.c.precoRef) - o.cu))}</span>` }
  ], prodRows, { id: "estprod", empty: "Nenhuma colheita registrada." }), { sub: "Posição atual por safra de origem. Custo unitário = custo de produção da safra ÷ quantidade colhida.", flush: true, tools: csvBtn("estprod", "estoque-produtos") })}`;
}, { period: true });

/* ---------- Colheitas ---------- */
function colheitaForm(h = {}) {
  const novo = !h.id;
  openForm({
    title: novo ? "Registrar colheita" : "Editar colheita", data: Object.assign({ data: today(), safraId: E().safraOf(today()) }, h),
    fields: [
      { k: "data", l: "Data", t: "date", req: true }, { k: "talhaoId", l: "Talhão", t: "sel", opts: optTalhoes(true), empty: "Selecione…", req: true, span: 4 },
      { k: "safraId", l: "Safra", t: "sel", opts: optSafras(), empty: "Selecione…", req: true },
      { k: "qtd", l: "Quantidade colhida", t: "num", req: true, help: "Na unidade comercial da cultura do talhão (ex.: sacas beneficiadas, kg seco)" },
      { k: "un", l: "Unidade", t: "calc", calc: v => { const t = get("talhoes", v.talhaoId); return t ? esc(UNID_NOME[unCult(t.culturaId)] || unCult(t.culturaId)) + " de " + esc(nomeCult(t.culturaId)) : "—"; } },
      { k: "classificacao", l: "Classificação / tipo", ph: "Ex.: bebida dura, tipo 6; pimenta tipo B" }, { k: "umidade", l: "Umidade (%)", t: "num" }, { k: "armazem", l: "Armazém / lote" },
      { k: "obs", l: "Observações", t: "area", span: 6 }
    ],
    onSave: async v => { const t = get("talhoes", v.talhaoId); v.culturaId = t ? t.culturaId : ""; v.qtd = num(v.qtd); if (v.qtd <= 0) return "Informe a quantidade colhida."; await Store.put("colheitas", v); return true; },
    onDelete: novo ? null : async () => { await Store.del("colheitas", h.id); closeModal(); }
  });
}
ACTIONS["colh-nova"] = () => colheitaForm();
ACTIONS["colh-edit"] = id => colheitaForm(get("colheitas", id));
route("colheitas", "Colheitas", () => {
  const e = E(); const hs = e.colheitas.filter(h => h.data >= P.from && h.data <= P.to).sort((a, b) => a.data < b.data ? 1 : -1);
  const porCult = [...groupBy(hs, h => h.culturaId).entries()];
  const cols = [{ h: "Data", f: h => fmtD(h.data) }, { h: "Talhão", f: h => `<b>${esc(nomeTal(h.talhaoId))}</b>` }, { h: "Cultura", f: h => esc(nomeCult(h.culturaId)) }, { h: "Safra", f: h => esc(nomeSafra(h.safraId)) },
    { h: "Quantidade", n: 1, f: h => `${nf(h.qtd, 1)} ${esc(unCult(h.culturaId))}` }, { h: "Produtividade parcial", n: 1, f: h => { const t = get("talhoes", h.talhaoId); return t && num(t.area) ? nf(h.qtd / num(t.area), 1) + " " + esc(unCult(h.culturaId)) + "/ha" : "—"; } },
    { h: "Classificação", f: h => esc(h.classificacao || "—") }, { h: "Umidade", n: 1, f: h => h.umidade ? nf(num(h.umidade), 1) + "%" : "—" }, { h: "Armazém", f: h => esc(h.armazem || "—") },
    { h: "", cls: "acts", f: h => `<button class="btn sm ghost" data-act="colh-edit" data-id="${h.id}" aria-label="Editar">${ico("edit")}</button>` }];
  return `<div class="kpis">${porCult.map(([c, a]) => { const q = sum(a, h => h.qtd); const cu = get("culturas", c) || {}; return kpi("Colhido · " + (cu.nome || "—"), nf(q, 1) + " " + esc(cu.unidade || ""), nf(q * num(cu.kgUnidade || 1) / 1000, 1) + " t"); }).join("") || kpi("Colheitas no período", "0", "Nenhum registro")}</div>
  ${panel("Registros de colheita", table(cols, hs, { id: "colheitas", empty: "Nenhuma colheita no período." }), { sub: periodTxt(), flush: true, tools: `<div class="toolbar">${csvBtn("colheitas", "colheitas")}<button class="btn pri sm" data-act="colh-nova">${ico("plus")} Registrar colheita</button></div>` })}`;
}, { period: true });

/* ---------- Movimentos de estoque de insumos ---------- */
const MF = { insumo: "", sub: "", q: "" };
function movForm(m = {}, preset = {}) {
  const novo = !m.id; let warned = false; const lanc = m.lancId ? get("lancamentos", m.lancId) : null;
  const d = Object.assign({ data: today(), subtipo: "compra", destino: "talhao", condicao: "prazo", vencimento: addDays(today(), 30), safraId: E().safraOf(today()) }, preset, m);
  if (lanc) { d.vencimento = lanc.vencimento; d.condicao = lanc.pagamento && lanc.pagamento === m.data ? "vista" : "prazo"; }
  const tipoOf = v => (SUBTIPOS[v.subtipo] || {}).tipo;
  openForm({
    title: novo ? "Nova movimentação de estoque" : "Editar movimentação", data: d, wide: false,
    fields: [
      { k: "subtipo", l: "Tipo de movimento", t: "sel", opts: Object.entries(SUBTIPOS).map(([k, s]) => [k, (s.tipo === "entrada" ? "Entrada · " : "Saída · ") + s.nome]), req: true, span: 3 },
      { k: "data", l: "Data", t: "date", req: true },
      { k: "insumoId", l: "Insumo", t: "sel", opts: optInsumos(), empty: "Selecione…", req: true, span: 3 },
      { k: "qtd", l: "Quantidade", t: "num", req: true },
      { k: "saldo", l: "Saldo atual", t: "calc", calc: v => { if (!v.insumoId) return "—"; const s = E().stockAt("9999-12-31", v.insumoId); const i = get("insumos", v.insumoId); return `${nf(s.qtd, 2)} ${esc(i.unidade)} · custo médio ${brl(s.qtd > 0 ? s.valor / s.qtd : 0)}`; } },
      { k: "valorUnit", l: "Valor unitário (R$)", t: "num", req: true, show: v => ["compra", "saldo_inicial"].includes(v.subtipo) },
      { k: "tot", l: "Total", t: "calc", show: v => ["compra", "saldo_inicial"].includes(v.subtipo), calc: v => `<b>${brl(num(v.qtd) * num(v.valorUnit))}</b>` },
      { k: "fornecedor", l: "Fornecedor", show: v => v.subtipo === "compra", req: true },
      { k: "documento", l: "Nota fiscal", show: v => v.subtipo === "compra" },
      { k: "condicao", l: "Condição de pagamento", t: "sel", opts: [["prazo", "A prazo (gera conta a pagar)"], ["vista", "À vista (pago na data)"]], show: v => v.subtipo === "compra" },
      { k: "vencimento", l: "Vencimento", t: "date", show: v => v.subtipo === "compra" && v.condicao === "prazo" },
      { k: "lote", l: "Lote", show: v => tipoOf(v) === "entrada" }, { k: "validade", l: "Validade", t: "date", show: v => tipoOf(v) === "entrada" },
      { k: "destino", l: "Destino do consumo", t: "sel", opts: [["talhao", "Talhão específico"], ["rateio", "Produção geral (rateio por área)"], ["adm", "Administrativo / sede"]], show: v => v.subtipo === "aplicacao" },
      { k: "talhaoId", l: "Talhão", t: "sel", opts: optTalhoes(true), empty: "Selecione…", span: 4, show: v => v.subtipo === "aplicacao" && v.destino === "talhao" },
      { k: "safraId", l: "Safra", t: "sel", opts: optSafras(), empty: "Pela data", show: v => v.subtipo === "aplicacao" },
      { k: "operacao", l: "Operação", t: "sel", opts: OPERACOES.map(o => [o, o]), empty: "—", show: v => v.subtipo === "aplicacao" },
      { k: "dose", l: "Dose aplicada", t: "calc", show: v => v.subtipo === "aplicacao" && v.destino === "talhao", calc: v => { const t = get("talhoes", v.talhaoId), i = get("insumos", v.insumoId); return t && i && num(t.area) ? `<b>${nf(num(v.qtd) / num(t.area), 2)}</b> ${esc(i.unidade)}/ha em ${nf(num(t.area), 1)} ha` : "—"; } },
      { k: "responsavel", l: "Responsável", show: v => tipoOf(v) === "saida" },
      { k: "obs", l: "Observações / motivo", t: "area", span: 6 }
    ],
    onSave: async v => {
      v.qtd = num(v.qtd); if (v.qtd <= 0) return "Informe a quantidade.";
      v.valorUnit = num(v.valorUnit);
      if (v.subtipo === "aplicacao" && v.destino === "talhao") { if (!v.talhaoId) return "Escolha o talhão."; v.culturaId = (get("talhoes", v.talhaoId) || {}).culturaId || ""; } else { v.talhaoId = ""; v.culturaId = ""; }
      if (tipoOf(v) === "saida") { const s = E().stockAt("9999-12-31", v.insumoId).qtd + (novo ? 0 : (tipoOf(m) === "saida" && m.insumoId === v.insumoId ? num(m.qtd) : 0)); if (v.qtd > s + 1e-9 && !warned) { warned = true; return `Saldo insuficiente (${nf(s, 2)}). Clique em Salvar novamente para registrar mesmo assim (estoque ficará negativo).`; } }
      const cond = v.condicao, venc = v.vencimento; const now = new Date().toISOString();
      const mov = { ...v }; delete mov.condicao; delete mov.vencimento; if (!mov.criado) mov.criado = now; if (!mov.id) mov.id = uid("m");
      const ops = [];
      if (v.subtipo === "compra") {
        const i = get("insumos", v.insumoId); const lid = m.lancId || uid("l");
        const l0 = lanc || {};
        const pg = cond === "vista" ? v.data : (l0.pagamento && l0.pagamento !== m.data ? l0.pagamento : "");
        ops.push({ op: "put", col: "lancamentos", obj: { ...l0, id: lid, categoriaId: "c_compra_ins", descricao: `Compra de ${i.nome} – ${nf(v.qtd, 2)} ${i.unidade}`, valor: v.qtd * v.valorUnit, competencia: v.data, vencimento: cond === "vista" ? v.data : venc, pagamento: pg, contraparte: v.fornecedor, documento: v.documento, origem: "compra", movId: mov.id, criado: l0.criado || now } });
        mov.lancId = lid;
      } else if (m.lancId) { ops.push({ op: "del", col: "lancamentos", id: m.lancId }); mov.lancId = ""; }
      ops.push({ op: "put", col: "movimentos", obj: mov });
      await Store.bulk(ops); return true;
    },
    onDelete: novo ? null : async () => { const ops = [{ op: "del", col: "movimentos", id: m.id }]; if (m.lancId) ops.push({ op: "del", col: "lancamentos", id: m.lancId }); await Store.bulk(ops); closeModal(); }
  });
}
ACTIONS["mov-entrada"] = () => movForm({}, { subtipo: "compra" });
ACTIONS["mov-saida"] = () => movForm({}, { subtipo: "aplicacao" });
ACTIONS["mov-edit"] = id => movForm(get("movimentos", id));
ACTIONS["mf-ins"] = (_, el) => { MF.insumo = el.value; render(); };
ACTIONS["mf-sub"] = (_, el) => { MF.sub = el.value; render(); };
route("movimentos", "Estoque de insumos", () => {
  const e = E(); const h = today();
  let ms = e.movs.filter(m => m.data >= P.from && m.data <= P.to);
  if (MF.insumo) ms = ms.filter(m => m.insumoId === MF.insumo); if (MF.sub) ms = ms.filter(m => m.subtipo === MF.sub);
  ms = ms.slice().reverse();
  const pos = all("insumos").map(i => ({ i, s: e.stockAt(h, i.id) })).filter(x => Math.abs(x.s.qtd) > 1e-9 || num(x.i.estoqueMin) > 0);
  const abaixo = pos.filter(x => num(x.i.estoqueMin) > 0 && x.s.qtd < num(x.i.estoqueMin));
  const valor = e.stockAt(h).valor;
  const entr = sum(ms.filter(m => SUBTIPOS[m.subtipo].tipo === "entrada" && m.subtipo !== "saldo_inicial"), m => e.mv.get(m.id).valor);
  const cons = sum(ms.filter(m => m.subtipo === "aplicacao"), m => e.mv.get(m.id).valor);
  const perd = sum(ms.filter(m => ["perda", "vencido", "ajuste_neg"].includes(m.subtipo)), m => e.mv.get(m.id).valor);
  const cols = [
    { h: "Data", f: m => fmtD(m.data) }, { h: "Movimento", f: m => SUBTIPOS[m.subtipo].tipo === "entrada" ? pill(SUBTIPOS[m.subtipo].nome, "info") : pill(SUBTIPOS[m.subtipo].nome, ["perda", "vencido", "ajuste_neg"].includes(m.subtipo) ? "bad" : "warn") },
    { h: "Insumo", f: m => `<b>${esc((get("insumos", m.insumoId) || {}).nome || "—")}</b>`, cls: "wrap" },
    { h: "Quantidade", n: 1, f: m => `${SUBTIPOS[m.subtipo].tipo === "entrada" ? "+" : "−"}${nf(num(m.qtd), 2)} ${esc((get("insumos", m.insumoId) || {}).unidade || "")}` },
    { h: "Custo unit.", n: 1, f: m => brl(e.mv.get(m.id).cu) }, { h: "Valor", n: 1, f: m => brl(e.mv.get(m.id).valor) },
    { h: "Destino / origem", f: m => m.subtipo === "compra" ? esc(m.fornecedor || "") + (m.documento ? ` · NF ${esc(m.documento)}` : "") : m.subtipo === "aplicacao" ? (m.destino === "talhao" ? esc(nomeTal(m.talhaoId)) : m.destino === "adm" ? "Administrativo" : "Rateio produção") + (m.operacao ? `<div class="note">${esc(m.operacao)}</div>` : "") : esc(m.obs || ""), cls: "wrap" },
    { h: "Saldo após", n: 1, f: m => nf(e.mv.get(m.id).saldoQtd, 2) },
    { h: "", cls: "acts", f: m => `<button class="btn sm ghost" data-act="mov-edit" data-id="${m.id}" aria-label="Editar">${ico("edit")}</button>` }
  ];
  return `<div class="kpis">${kpi("Valor em estoque hoje", brl0(valor), `${pos.filter(x => x.s.qtd > 1e-9).length} itens com saldo`)}${kpi("Entradas no período", brl0(entr), "Compras e ajustes")}${kpi("Consumo no período", brl0(cons), "Aplicações nas lavouras e sede")}${kpi("Perdas no período", brl0(perd), pct(ratio(perd, cons + perd)) + " das saídas")}${kpi("Abaixo do mínimo", String(abaixo.length), abaixo.length ? pill("Programar compra", "bad") : pill("Estoques adequados", "good"))}</div>
  ${abaixo.length ? panel("Reposição necessária", table([{ h: "Insumo", f: x => `<b>${esc(x.i.nome)}</b>` }, { h: "Saldo", n: 1, f: x => nf(x.s.qtd, 2) + " " + esc(x.i.unidade) }, { h: "Mínimo", n: 1, f: x => nf(num(x.i.estoqueMin), 2) }, { h: "Comprar ao menos", n: 1, f: x => `<b>${nf(num(x.i.estoqueMin) - x.s.qtd, 2)}</b> ${esc(x.i.unidade)}` }], abaixo), { flush: true }) : ""}
  ${panel("Movimentações", table(cols, ms, { id: "movs", empty: "Nenhuma movimentação no período." }), {
    sub: periodTxt() + " · custo médio ponderado móvel", flush: true,
    tools: `<div class="toolbar"><select class="inp sm" data-act="mf-ins" aria-label="Insumo">${opt(optInsumos(), MF.insumo, "Todos os insumos")}</select><select class="inp sm" data-act="mf-sub" aria-label="Tipo">${opt(Object.entries(SUBTIPOS).map(([k, s]) => [k, s.nome]), MF.sub, "Todos os tipos")}</select>${csvBtn("movs", "movimentacoes-estoque")}<button class="btn sm" data-act="mov-saida">${ico("plus")} Saída / aplicação</button><button class="btn pri sm" data-act="mov-entrada">${ico("plus")} Entrada / compra</button></div>`
  })}`;
}, { period: true });

/* ---------- Cadastros simples ---------- */
function crudPage({ col, title, cols, form, sort, empty, sub }) {
  const rows = all(col).sort(sort || ((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { numeric: true })));
  return panel(title, table(cols.concat([{ h: "", cls: "acts", f: r => `<button class="btn sm ghost" data-act="${col}-edit" data-id="${r.id}" aria-label="Editar">${ico("edit")}</button>` }]), rows, { id: col, empty }), { sub, flush: true, tools: `<div class="toolbar">${csvBtn(col, col)}<button class="btn pri sm" data-act="${col}-novo">${ico("plus")} Novo</button></div>` });
}
function refsTo(field, id) { return COLS.reduce((n, c) => n + all(c).filter(x => x[field] === id).length, 0); }

function talhaoForm(t = {}) {
  openForm({
    title: t.id ? "Editar talhão" : "Novo talhão", data: Object.assign({ ativo: true }, t), fields: [
      { k: "nome", l: "Nome / código", req: true }, { k: "area", l: "Área (ha)", t: "num", req: true }, { k: "culturaId", l: "Cultura atual", t: "sel", opts: optCulturas(), empty: "Selecione…", req: true },
      { k: "variedade", l: "Variedade / cultivar" }, { k: "anoPlantio", l: "Ano de plantio", t: "num" }, { k: "espacamento", l: "Espaçamento", ph: "Ex.: 3,5 x 0,7 m" },
      { k: "plantas", l: "Nº de plantas / covas", t: "num" }, { k: "irrigado", l: "Irrigado", t: "chk" }, { k: "ativo", l: "Talhão ativo", t: "chk", help: "Inativos não entram no rateio de custos" },
      { k: "obs", l: "Observações (solo, relevo, coordenadas)", t: "area", span: 6 }
    ],
    onSave: async v => { v.area = num(v.area); if (v.area <= 0) return "A área deve ser maior que zero."; await Store.put("talhoes", v); return true; },
    onDelete: t.id ? async () => { if (refsTo("talhaoId", t.id)) return "Talhão possui colheitas, aplicações ou lançamentos. Marque como inativo em vez de excluir."; await Store.del("talhoes", t.id); closeModal(); } : null
  });
}
ACTIONS["talhoes-novo"] = () => talhaoForm(); ACTIONS["talhoes-edit"] = id => talhaoForm(get("talhoes", id));
route("talhoes", "Talhões", () => {
  const ts = all("talhoes"); const e = E();
  const porC = [...e.areaCult.entries()].map(([c, a]) => kpi(nomeCult(c), nf(a, 1) + " ha", pct(a / (e.areaTot || 1)) + " da área produtiva")).join("");
  return `<div class="kpis">${kpi("Área produtiva ativa", nf(e.areaTot, 1) + " ha", `${e.talAtivos.length} talhões`, "hero")}${porC}</div>` + crudPage({
    col: "talhoes", title: "Talhões e lavouras", empty: "Cadastre os talhões com área e cultura.", sub: "Base para produtividade, custo por hectare e rateio de custos",
    cols: [{ h: "Talhão", f: t => `<b>${esc(t.nome)}</b>` }, { h: "Cultura", f: t => esc(nomeCult(t.culturaId)) }, { h: "Variedade", f: t => esc(t.variedade || "—") }, { h: "Área (ha)", n: 1, f: t => nf(num(t.area), 2) },
      { h: "Plantio", n: 1, f: t => t.anoPlantio ? String(t.anoPlantio) : "—" }, { h: "Espaçamento", f: t => esc(t.espacamento || "—") }, { h: "Plantas", n: 1, f: t => t.plantas ? nf(num(t.plantas), 0) : "—" },
      { h: "Situação", f: t => (t.ativo === false ? pill("Inativo") : pill("Ativo", "good")) + (t.irrigado ? " " + pill("Irrigado", "info") : "") }]
  });
});

function culturaForm(c = {}) {
  openForm({
    title: c.id ? "Editar cultura" : "Nova cultura", data: Object.assign({ unidade: "sc", kgUnidade: 60 }, c), fields: [
      { k: "nome", l: "Nome", req: true }, { k: "unidade", l: "Unidade comercial", t: "sel", opts: [["sc", "Saca (sc)"], ["kg", "Quilograma (kg)"], ["t", "Tonelada (t)"], ["@", "Arroba (@)"]], req: true, onchange: (frm, v) => { const k = { sc: 60, kg: 1, t: 1000, "@": 15 }[v.unidade]; $("[name=kgUnidade]", frm).value = String(k).replace(".", ","); } },
      { k: "kgUnidade", l: "Kg por unidade", t: "num", req: true, help: "Saca de café/grãos = 60 kg" },
      { k: "precoRef", l: "Preço de referência (R$/unidade)", t: "num", help: "Usado para valor de mercado do estoque e receita estimada" },
      { k: "tipo", l: "Tipo", t: "sel", opts: [["perene", "Perene (café, pimenta)"], ["anual", "Anual (soja, milho, feijão…)"]] }
    ],
    onSave: async v => { v.kgUnidade = num(v.kgUnidade) || 1; v.precoRef = num(v.precoRef); await Store.put("culturas", v); return true; },
    onDelete: c.id ? async () => { if (refsTo("culturaId", c.id)) return "Cultura em uso em talhões, colheitas ou vendas."; await Store.del("culturas", c.id); closeModal(); } : null
  });
}
function safraForm(s = {}) {
  openForm({
    title: s.id ? "Editar safra" : "Nova safra", data: s, fields: [
      { k: "nome", l: "Nome", req: true, ph: "Ex.: 2025/26" }, { k: "inicio", l: "Início", t: "date", req: true }, { k: "fim", l: "Fim", t: "date", req: true }
    ],
    onSave: async v => { if (v.fim <= v.inicio) return "A data final deve ser posterior ao início."; const conf = all("safras").find(x => x.id !== v.id && !(v.fim < x.inicio || v.inicio > x.fim)); if (conf) return `O período se sobrepõe à safra ${conf.nome}.`; await Store.put("safras", v); return true; },
    onDelete: s.id ? async () => { if (refsTo("safraId", s.id) || get("orcamentos", s.id)) return "Safra em uso em lançamentos, colheitas ou orçamento."; await Store.del("safras", s.id); closeModal(); } : null
  });
}
ACTIONS["culturas-novo"] = () => culturaForm(); ACTIONS["culturas-edit"] = id => culturaForm(get("culturas", id));
ACTIONS["safras-novo"] = () => safraForm(); ACTIONS["safras-edit"] = id => safraForm(get("safras", id));
route("culturas", "Culturas e safras", () => crudPage({
  col: "culturas", title: "Culturas", sub: "Unidade comercial define como produtividade e estoque são medidos",
  cols: [{ h: "Cultura", f: c => `<b>${esc(c.nome)}</b>` }, { h: "Tipo", f: c => c.tipo === "anual" ? "Anual" : "Perene" }, { h: "Unidade", f: c => esc(UNID_NOME[c.unidade] || c.unidade) }, { h: "Kg/unidade", n: 1, f: c => nf(num(c.kgUnidade), 0) }, { h: "Preço de referência", n: 1, f: c => brl(num(c.precoRef)) + "/" + esc(c.unidade) }]
}) + crudPage({
  col: "safras", title: "Safras (anos agrícolas)", sub: "Períodos usados para custos, produtividade e orçamento", sort: (a, b) => a.inicio < b.inicio ? 1 : -1,
  cols: [{ h: "Safra", f: s => `<b>${esc(s.nome)}</b>` }, { h: "Início", f: s => fmtD(s.inicio) }, { h: "Fim", f: s => fmtD(s.fim) }, { h: "Situação", f: s => today() < s.inicio ? pill("Futura", "info") : today() > s.fim ? pill("Encerrada") : pill("Em andamento", "good") }]
}));

function insumoForm(i = {}) {
  openForm({
    title: i.id ? "Editar insumo" : "Novo insumo", data: Object.assign({ unidade: "kg", grupo: "Fertilizante", categoriaId: "c_fert" }, i), fields: [
      { k: "nome", l: "Nome comercial", req: true, span: 4 }, { k: "grupo", l: "Grupo", t: "sel", opts: GRUPOS_INSUMO.map(g => [g, g]), req: true, onchange: (frm, v) => { $("[name=categoriaId]", frm).value = INSUMO_CAT_DEFAULT[v.grupo] || "c_outros_custos"; } },
      { k: "unidade", l: "Unidade de estoque", t: "sel", opts: UNIDADES_INSUMO.map(u => [u, u]), req: true }, { k: "estoqueMin", l: "Estoque mínimo", t: "num", help: "Gera alerta de reposição" },
      { k: "categoriaId", l: "Conta de custo do consumo", t: "sel", opts: optCategorias(c => c.grupo === "custo"), req: true, span: 2 },
      { k: "principioAtivo", l: "Princípio ativo / formulação", span: 3 }, { k: "fabricante", l: "Fabricante" }, { k: "local", l: "Local de armazenagem" },
      { k: "registro", l: "Registro MAPA / classe toxicológica" }, { k: "carencia", l: "Carência (dias)", t: "num" }, { k: "obs", l: "Observações", t: "area", span: 6 }
    ],
    onSave: async v => { v.estoqueMin = num(v.estoqueMin); await Store.put("insumos", v); return true; },
    onDelete: i.id ? async () => { if (refsTo("insumoId", i.id)) return "Insumo possui movimentações de estoque."; await Store.del("insumos", i.id); closeModal(); } : null
  });
}
ACTIONS["insumos-novo"] = () => insumoForm(); ACTIONS["insumos-edit"] = id => insumoForm(get("insumos", id));
route("insumos", "Insumos", () => { const e = E(); const h = today(); return crudPage({
  col: "insumos", title: "Cadastro de insumos", sub: "Fertilizantes, defensivos, sementes, combustíveis e materiais",
  cols: [{ h: "Insumo", f: i => `<b>${esc(i.nome)}</b>${i.principioAtivo ? `<div class="note">${esc(i.principioAtivo)}</div>` : ""}`, cls: "wrap" }, { h: "Grupo", f: i => esc(i.grupo) }, { h: "Unidade", f: i => esc(i.unidade) },
    { h: "Saldo", n: 1, f: i => nf(e.stockAt(h, i.id).qtd, 2) }, { h: "Mínimo", n: 1, f: i => nf(num(i.estoqueMin), 2) }, { h: "Conta de custo", f: i => esc(nomeCat(i.categoriaId)) }, { h: "Local", f: i => esc(i.local || "—") }]
}); });

function categoriaForm(c = {}) {
  openForm({
    title: c.id ? "Editar conta" : "Nova conta gerencial", data: Object.assign({ grupo: "custo", natureza: "variavel" }, c), fields: [
      { k: "nome", l: "Nome da conta", req: true, span: 4, disabled: c.sistema }, { k: "grupo", l: "Grupo (estrutura DRE / DFC)", t: "sel", opts: Object.entries(GRUPOS).filter(([k, g]) => !g.sistema || k === c.grupo).map(([k, g]) => [k, g.nome]), req: true, disabled: c.sistema },
      { k: "natureza", l: "Comportamento", t: "sel", opts: [["variavel", "Variável (acompanha volume)"], ["fixo", "Fixo (estrutura)"]], help: "Usado na margem de contribuição e no ponto de equilíbrio", span: 3 }
    ],
    onSave: async v => { await Store.put("categorias", v); return true; },
    onDelete: c.id && !c.sistema ? async () => { if (refsTo("categoriaId", c.id)) return "Conta possui lançamentos ou insumos vinculados."; await Store.del("categorias", c.id); closeModal(); } : null
  });
}
ACTIONS["categorias-novo"] = () => categoriaForm(); ACTIONS["categorias-edit"] = id => categoriaForm(get("categorias", id));
route("categorias", "Plano de contas", () => {
  const cs = all("categorias");
  const rows = Object.keys(GRUPOS).flatMap(g => { const x = cs.filter(c => c.grupo === g).sort((a, b) => a.nome.localeCompare(b.nome)); return x.length ? [{ _sec: GRUPOS[g].nome, _cls: "sec", g }].concat(x) : []; });
  const destino = g => ({ receita: "DRE · Receita bruta", deducao: "DRE · Deduções", custo: "Estoque de produção → DRE · CMV na venda", comercial: "DRE · Despesas comerciais", administrativa: "DRE · Despesas G&A", rec_fin: "DRE · Resultado financeiro", desp_fin: "DRE · Resultado financeiro", ir: "DRE · IRPJ e CSLL", compra_insumo: "Balanço · Estoque de insumos", investimento: "Balanço · Imobilizado", captacao: "Balanço · Empréstimos", amortizacao: "Balanço · Empréstimos", aporte: "Balanço · Patrimônio líquido", distribuicao: "Balanço · Patrimônio líquido" }[g]);
  const flux = g => ({ op: "Operacional", inv: "Investimento", fin: "Financiamento" }[GRUPOS[g].fluxo]);
  return panel("Plano de contas gerencial", table([
    { h: "Conta", f: r => r._sec ? esc(r._sec) : `<b>${esc(r.nome)}</b>${r.sistema ? " " + pill("Automática", "plain") : ""}` },
    { h: "Vai para", f: r => r._sec ? "" : esc(destino(r.grupo)) }, { h: "Fluxo de caixa", f: r => r._sec ? "" : flux(r.grupo) },
    { h: "Comportamento", f: r => r._sec ? "" : (r.natureza === "fixo" ? "Fixo" : "Variável") },
    { h: "", cls: "acts", f: r => r._sec ? "" : `<button class="btn sm ghost" data-act="categorias-edit" data-id="${r.id}" aria-label="Editar">${ico("edit")}</button>` }
  ], rows, { id: "categorias" }), { sub: "Cada conta define a linha da DRE, a atividade do fluxo de caixa e o comportamento de custo", flush: true, tools: `<div class="toolbar">${csvBtn("categorias", "plano-de-contas")}<button class="btn pri sm" data-act="categorias-novo">${ico("plus")} Nova conta</button></div>` });
});

/* ---------- Patrimônio (ativos) ---------- */
function ativoForm(a = {}) {
  const novo = !a.id; const linked = a.id ? all("lancamentos").filter(l => l.ativoId === a.id) : [];
  const d = Object.assign({ tipo: "maq", origem: "compra", dataAquisicao: today(), vidaUtil: 10, residual: 0, parcelas: 1, primeiroVenc: today() }, a);
  openForm({
    title: novo ? "Novo bem patrimonial" : "Editar bem", data: d, fields: [
      { k: "descricao", l: "Descrição do bem", req: true, span: 4 },
      { k: "tipo", l: "Tipo", t: "sel", opts: TIPOS_ATIVO.map(t => [t[0], t[1]]), req: true, onchange: (frm, v) => { const t = TIPOS_ATIVO.find(x => x[0] === v.tipo); $("[name=vidaUtil]", frm).value = t[2]; } },
      { k: "dataAquisicao", l: "Data de aquisição", t: "date", req: true }, { k: "valor", l: "Valor de aquisição (R$)", t: "num", req: true }, { k: "vidaUtil", l: "Vida útil (anos)", t: "num", help: "0 = não deprecia (terras)" },
      { k: "residual", l: "Valor residual (R$)", t: "num" }, { k: "identificacao", l: "Placa / chassi / matrícula" },
      { k: "origem", l: "Como entra no sistema", t: "sel", opts: [["compra", "Compra (gera contas a pagar)"], ["abertura", "Já existia na implantação"]], span: 3, disabled: !novo && linked.some(l => l.pagamento) },
      { k: "parcelas", l: "Nº de parcelas", t: "num", show: v => v.origem === "compra" }, { k: "primeiroVenc", l: "1º vencimento", t: "date", show: v => v.origem === "compra" },
      { k: "aVista", l: "Pago à vista na aquisição", t: "chk", show: v => v.origem === "compra" },
      { k: "dep", l: "Depreciação", t: "calc", span: 6, calc: v => { const vu = num(v.vidaUtil); if (!vu) return "Sem depreciação."; const m = (num(v.valor) - num(v.residual)) / (vu * 12); return `Depreciação mensal estimada: <b>${brl(m)}</b> · anual ${brl(m * 12)}`; } }
    ],
    note: !novo && linked.some(l => l.pagamento) ? "Parcelas já pagas são mantidas. Ao salvar, as parcelas em aberto são recalculadas para o saldo restante." : "",
    onSave: async v => {
      v.valor = num(v.valor); v.vidaUtil = num(v.vidaUtil); v.residual = num(v.residual); v.parcelas = Math.max(1, Math.round(num(v.parcelas) || 1));
      if (v.valor <= 0) return "Informe o valor do bem."; if (!v.id) v.id = uid("a");
      const ops = [{ op: "put", col: "ativos", obj: v }];
      const pagos = linked.filter(l => l.pagamento); linked.filter(l => !l.pagamento).forEach(l => ops.push({ op: "del", col: "lancamentos", id: l.id }));
      if (v.origem === "compra") {
        const rest = v.valor - sum(pagos, l => num(l.valor)); const n = Math.max(1, v.parcelas - pagos.length);
        if (rest > 0.004) for (let i = 0; i < n; i++) ops.push({ op: "put", col: "lancamentos", obj: { id: uid("l"), categoriaId: "c_inv_imob", descricao: `${v.descricao} – parcela ${pagos.length + i + 1}/${pagos.length + n}`, valor: rest / n, competencia: v.dataAquisicao, vencimento: v.aVista && i === 0 && !pagos.length ? v.dataAquisicao : addMonths(v.primeiroVenc, i), pagamento: v.aVista && n === 1 ? v.dataAquisicao : "", contraparte: v.fornecedor || "", origem: "ativo", ativoId: v.id, criado: new Date().toISOString() } });
      }
      await Store.bulk(ops); return true;
    },
    onDelete: novo ? null : async () => { if (linked.some(l => l.pagamento)) return "O bem tem parcelas pagas. Mantenha o cadastro para preservar o histórico."; await Store.bulk([{ op: "del", col: "ativos", id: a.id }].concat(linked.map(l => ({ op: "del", col: "lancamentos", id: l.id })))); closeModal(); }
  });
}
ACTIONS["ativos-novo"] = () => ativoForm(); ACTIONS["ativos-edit"] = id => ativoForm(get("ativos", id));
route("ativos", "Patrimônio", () => {
  const e = E(); const h = today(); const as = e.ativos;
  const bruto = sum(as, a => a.valor), dep = sum(as, a => e.depAcum(a, h));
  const depAno = e.depPeriodo(h.slice(0, 4) + "-01-01", h.slice(0, 4) + "-12-31").total;
  return `<div class="kpis">${kpi("Imobilizado bruto", brl0(bruto), as.length + " bens")}${kpi("Depreciação acumulada", brl0(-dep), pct(ratio(dep, bruto)) + " do valor")}${kpi("Valor contábil líquido", brl0(bruto - dep), "", "hero")}${kpi("Depreciação no ano", brl0(depAno), "Despesa abaixo do EBITDA")}</div>` + crudPage({
    col: "ativos", title: "Bens do imobilizado", sub: "Depreciação linear diária pela vida útil", sort: (a, b) => b.valor - a.valor,
    cols: [{ h: "Bem", f: a => `<b>${esc(a.descricao)}</b>${a.identificacao ? `<div class="note">${esc(a.identificacao)}</div>` : ""}`, cls: "wrap" }, { h: "Tipo", f: a => esc(a.tipoNome) }, { h: "Aquisição", f: a => fmtD(a.dataAquisicao) },
      { h: "Valor", n: 1, f: a => brl(a.valor) }, { h: "Vida útil", n: 1, f: a => a.vidaUtil ? a.vidaUtil + " anos" : "—" }, { h: "Dep. acumulada", n: 1, f: a => brl(-e.depAcum(a, h)) }, { h: "Valor líquido", n: 1, f: a => `<b>${brl(a.valor - e.depAcum(a, h))}</b>` },
      { h: "Situação", f: a => a.dias && e.depAcum(a, h) >= a.base - 0.01 ? pill("Totalmente depreciado") : a.origem === "abertura" ? pill("Saldo de implantação", "plain") : pill("Em uso", "good") }]
  });
});

/* ---------- Financiamentos ---------- */
function gerarCronograma(c, o) {
  // o: {valor, liberacao, nParc, periodo(meses), carencia(meses), sistema, taxa(a.a.), primeiroVenc}
  const ops = []; const i = Math.pow(1 + num(o.taxa) / 100, num(o.periodo) / 12) - 1; const n = Math.max(1, Math.round(num(o.nParc)));
  let saldo = num(o.valor); const now = new Date().toISOString();
  if (!o.existente) ops.push({ op: "put", col: "lancamentos", obj: { id: uid("l"), categoriaId: "c_captacao", descricao: `Liberação – ${c.banco} ${c.linha || ""}`.trim(), valor: saldo, competencia: o.liberacao, vencimento: o.liberacao, pagamento: o.liberacao <= today() ? o.liberacao : "", contraparte: c.banco, contratoId: c.id, origem: "contrato", criado: now } });
  // juros da carência
  let data = o.liberacao; const iMes = Math.pow(1 + num(o.taxa) / 100, 1 / 12) - 1;
  const carDate = addMonths(o.liberacao, num(o.carencia));
  const first = o.primeiroVenc || addMonths(carDate, num(o.periodo));
  if (num(o.carencia) > 0 && i > 0) {
    let d = addMonths(o.liberacao, num(o.periodo));
    while (d < first) { const j = saldo * (Math.pow(1 + iMes, daysBetween(data, d) / 30.4375) - 1); ops.push({ op: "put", col: "lancamentos", obj: { id: uid("l"), categoriaId: "c_juros", descricao: `Juros carência – ${c.banco}`, valor: j, competencia: d, vencimento: d, pagamento: "", contraparte: c.banco, contratoId: c.id, origem: "contrato", criado: now } }); data = d; d = addMonths(d, num(o.periodo)); }
  }
  const pmt = o.sistema === "price" && i > 0 ? saldo * i / (1 - Math.pow(1 + i, -n)) : 0;
  for (let k = 0; k < n; k++) {
    const venc = addMonths(first, k * num(o.periodo)); const per = k === 0 ? Math.max(1, daysBetween(data, venc)) / 30.4375 : num(o.periodo);
    const juros = saldo * (Math.pow(1 + iMes, per) - 1); let amort = o.sistema === "price" && i > 0 ? pmt - juros : saldo / (n - k);
    if (k === n - 1) amort = saldo; saldo -= amort; data = venc;
    ops.push({ op: "put", col: "lancamentos", obj: { id: uid("l"), categoriaId: "c_amort", descricao: `Parcela ${k + 1}/${n} – ${c.banco} (principal)`, valor: amort, competencia: venc, vencimento: venc, pagamento: venc <= today() ? venc : "", contraparte: c.banco, contratoId: c.id, origem: "contrato", criado: now } });
    if (juros > 0.004) ops.push({ op: "put", col: "lancamentos", obj: { id: uid("l"), categoriaId: "c_juros", descricao: `Parcela ${k + 1}/${n} – ${c.banco} (juros)`, valor: juros, competencia: venc, vencimento: venc, pagamento: venc <= today() ? venc : "", contraparte: c.banco, contratoId: c.id, origem: "contrato", criado: now } });
  }
  return ops;
}
function contratoForm(c = {}) {
  const novo = !c.id;
  const d = Object.assign({ finalidade: "custeio", sistema: "sac", periodo: 12, nParc: 1, carencia: 0, liberacao: today(), existente: false, gerar: true }, c);
  openForm({
    title: novo ? "Novo contrato de financiamento" : "Editar contrato", data: d, fields: [
      { k: "banco", l: "Banco / credor", req: true }, { k: "linha", l: "Linha de crédito", ph: "Ex.: Pronamp custeio, Moderfrota, CPR" }, { k: "finalidade", l: "Finalidade", t: "sel", opts: [["custeio", "Custeio"], ["investimento", "Investimento"], ["comercializacao", "Comercialização"], ["outros", "Capital de giro / outros"]] },
      { k: "numero", l: "Nº da cédula / contrato" }, { k: "taxa", l: "Taxa de juros (% a.a.)", t: "num", req: true }, { k: "garantia", l: "Garantias" },
      { k: "existente", l: "Contrato já existia na implantação do sistema", t: "chk", span: 3, show: () => novo },
      { k: "saldoInicial", l: "Saldo devedor na implantação (R$)", t: "num", show: v => v.existente },
      { k: "s1", l: "Cronograma de pagamentos", t: "sec", show: () => novo },
      { k: "gerar", l: "Gerar parcelas automaticamente", t: "chk", show: () => novo },
      { k: "valor", l: "Valor liberado (R$)", t: "num", show: v => novo && v.gerar && !v.existente },
      { k: "liberacao", l: "Data da liberação / base", t: "date", show: v => novo && v.gerar },
      { k: "sistema", l: "Sistema de amortização", t: "sel", opts: [["sac", "SAC (amortização constante)"], ["price", "Price (parcela fixa)"]], show: v => novo && v.gerar },
      { k: "nParc", l: "Nº de parcelas", t: "num", show: v => novo && v.gerar }, { k: "periodo", l: "Periodicidade", t: "sel", opts: [["1", "Mensal"], ["6", "Semestral"], ["12", "Anual"]], show: v => novo && v.gerar },
      { k: "primeiroVenc", l: "1º vencimento", t: "date", show: v => novo && v.gerar },
      { k: "carencia", l: "Carência (meses)", t: "num", show: v => novo && v.gerar, help: "Juros pagos na periodicidade durante a carência" },
      { k: "obs", l: "Observações", t: "area", span: 6 }
    ],
    onSave: async v => {
      v.taxa = num(v.taxa); v.saldoInicial = v.existente ? num(v.saldoInicial) : 0; if (!v.id) v.id = uid("k");
      const o = { ...v }; const keep = ["id", "banco", "linha", "finalidade", "numero", "taxa", "garantia", "saldoInicial", "obs", "criado", "existente"];
      const doc = {}; keep.forEach(k => { if (v[k] !== undefined) doc[k] = v[k]; });
      const ops = [{ op: "put", col: "contratos", obj: doc }];
      if (novo && v.gerar) {
        o.valor = v.existente ? v.saldoInicial : num(v.valor); if (o.valor <= 0) return "Informe o valor do financiamento.";
        if (!o.primeiroVenc) o.primeiroVenc = addMonths(o.liberacao, num(o.carencia) + num(o.periodo));
        ops.push(...gerarCronograma(doc, o));
      }
      await Store.bulk(ops); return true;
    },
    onDelete: novo ? null : async () => { const ls = all("lancamentos").filter(l => l.contratoId === c.id); if (ls.some(l => l.pagamento) && !c._force) return "Contrato possui parcelas pagas. Exclua-as manualmente se quiser remover o histórico."; await Store.bulk([{ op: "del", col: "contratos", id: c.id }].concat(ls.map(l => ({ op: "del", col: "lancamentos", id: l.id })))); closeModal(); }
  });
}
ACTIONS["contratos-novo"] = () => contratoForm(); ACTIONS["contratos-edit"] = id => contratoForm(get("contratos", id));
function saldoContrato(c, D) { return num(c.saldoInicial) + sum(all("lancamentos").filter(l => l.contratoId === c.id && l.pagamento && l.pagamento <= D), l => { const g = E().grupoOf(l.categoriaId); return g === "captacao" ? num(l.valor) : g === "amortizacao" ? -num(l.valor) : 0; }); }
route("contratos", "Financiamentos", () => {
  const h = today(); const b = balanco(h);
  const prox = c => all("lancamentos").filter(l => l.contratoId === c.id && !l.pagamento && ["amortizacao", "desp_fin"].includes(E().grupoOf(l.categoriaId))).sort((a, b) => a.vencimento < b.vencimento ? -1 : 1);
  return `<div class="kpis">${kpi("Dívida bruta", brl0(b.emprest), "Empréstimos e financiamentos", "hero")}${kpi("Curto prazo (12 meses)", brl0(b.emprestCP), pct(ratio(b.emprestCP, b.emprest)) + " da dívida")}${kpi("Longo prazo", brl0(b.emprestLP), "")}${kpi("Dívida líquida", brl0(b.emprest - b.caixa), "Dívida − caixa")}</div>` + crudPage({
    col: "contratos", title: "Contratos", sub: "Captações, amortizações e juros são lançamentos vinculados ao contrato",
    cols: [{ h: "Credor", f: c => `<b>${esc(c.banco)}</b><div class="note">${esc(c.linha || "")}${c.numero ? " · " + esc(c.numero) : ""}</div>` }, { h: "Finalidade", f: c => esc({ custeio: "Custeio", investimento: "Investimento", comercializacao: "Comercialização", outros: "Outros" }[c.finalidade] || "—") },
      { h: "Taxa", n: 1, f: c => nf(num(c.taxa), 2) + "% a.a." }, { h: "Saldo devedor", n: 1, f: c => `<b>${brl(saldoContrato(c, h))}</b>` },
      { h: "Próximo vencimento", f: c => { const p = prox(c)[0]; return p ? fmtD(p.vencimento) : "—"; } }, { h: "Parcelas em aberto", n: 1, f: c => { const p = prox(c); return brl(sum(p, l => num(l.valor))); } }]
  });
});

/* ---------- Configurações ---------- */
route("configuracoes", "Configurações", () => {
  const C = cfg();
  return `<div class="grid g2">${panel("Dados da fazenda e implantação", `<div class="stat-row" style="flex-direction:column;gap:6px">
    <div>Fazenda: <b>${esc(C.fazenda || "—")}</b></div><div>Produtor / empresa: <b>${esc(C.produtor || "—")}</b> ${C.documento ? "· " + esc(C.documento) : ""}</div>
    <div>Município: <b>${esc(C.municipio || "—")}</b></div><div>Data de implantação: <b>${fmtD(C.dataAbertura)}</b></div>
    <div>Caixa e bancos na implantação: <b>${brl(num(C.caixaInicial))}</b></div><div>Capital social: <b>${brl(num(C.capitalSocial))}</b></div>
    <div>Funrural padrão nas vendas: <b>${nf(num(C.funruralPct), 2)}%</b></div></div>`, { tools: `<button class="btn sm pri" data-act="cfg-edit">${ico("edit")} Editar</button>` })}
    ${panel("Backup e dados", `<div style="display:flex;flex-direction:column;gap:10px"><p class="note" style="margin:0">Exporte todos os cadastros e lançamentos em JSON para guardar uma cópia de segurança.</p>
      <div class="toolbar"><button class="btn" data-act="backup">${ico("dl")} Baixar backup (JSON)</button></div>
      <p class="note" style="margin:0">Apagar todos os dados remove cadastros, lançamentos, estoques e orçamentos para recomeçar (por exemplo, depois de testar com a fazenda de exemplo).</p>
      <div class="toolbar"><button class="btn danger" data-act="wipe">${ico("trash")} Apagar todos os dados</button></div>
      <div class="note">Armazenamento: ${Store.mode === "db" ? "banco de dados do sistema (compartilhado com quem tem acesso)" : "local, somente neste navegador"}.</div></div>`)}</div>
    ${panel("Como o sistema contabiliza", `<div class="note" style="display:flex;flex-direction:column;gap:6px;color:var(--fg-2)">
      <div><b>Compras de insumos</b> entram no estoque (ativo) pelo valor da nota. O consumo nas lavouras sai pelo custo médio ponderado e vira custo de produção da safra.</div>
      <div><b>Custos de produção</b> (insumos aplicados, mão de obra de campo, serviços, energia, arrendamento…) acumulam por cultura e safra como lavoura em formação. Na colheita viram estoque de produto; o custo unitário é o custo total da safra ÷ quantidade colhida.</div>
      <div><b>CMV</b> é reconhecido na venda: quantidade vendida × custo unitário da safra de origem. Perdas e ajustes de estoque de insumos entram no CMV.</div>
      <div><b>Depreciação</b> é linear diária pela vida útil e fica abaixo do EBITDA. Juros de financiamentos são despesas financeiras; principal é atividade de financiamento.</div>
      <div><b>Competência × caixa:</b> a DRE usa a data de competência; o fluxo de caixa usa a data de pagamento. A diferença aparece no balanço como contas a receber, fornecedores e adiantamentos.</div>
      <div><b>Custos sem talhão</b> são rateados pela área dos talhões ativos (da cultura informada ou de toda a fazenda).</div></div>`)}`;
});
function cfgForm(first) {
  const C = cfg();
  openForm({
    title: first ? "Implantação do sistema" : "Configurações da fazenda", data: Object.assign({ fazenda: (typeof SB !== "undefined" && SB.faz) ? SB.faz.nome : "", dataAbertura: today().slice(0, 4) + "-01-01", funruralPct: 1.5, caixaInicial: 0, capitalSocial: 0 }, C), fields: [
      { k: "fazenda", l: "Nome da fazenda", req: true, span: 3 }, { k: "produtor", l: "Produtor / razão social", span: 3 }, { k: "documento", l: "CPF / CNPJ" }, { k: "ie", l: "Inscrição estadual" }, { k: "municipio", l: "Município / UF" },
      { k: "s1", l: "Saldos de implantação", t: "sec" },
      { k: "dataAbertura", l: "Data de implantação", t: "date", req: true, help: "Início do controle no sistema" }, { k: "caixaInicial", l: "Caixa e bancos na data (R$)", t: "num" }, { k: "capitalSocial", l: "Capital social (R$)", t: "num", help: "A diferença para o PL de abertura vira reservas" },
      { k: "funruralPct", l: "Funrural / Senar padrão (%)", t: "num", help: "PF: 1,5% · PJ: 2,05% (confira seu enquadramento)" }
    ],
    note: first ? "Informe o saldo de caixa na data de implantação. Estoques de insumos, bens e financiamentos existentes são lançados depois como saldo inicial em cada módulo." : "",
    onSave: async v => { v.caixaInicial = num(v.caixaInicial); v.capitalSocial = num(v.capitalSocial); v.funruralPct = num(v.funruralPct); v.id = "main"; await Store.put("cfg", v); if (first) await seedBase(); return true; }
  });
}
ACTIONS["cfg-edit"] = () => cfgForm(false);
ACTIONS["backup"] = async () => { const o = { exportado: new Date().toISOString(), versao: 1 }; COLS.forEach(c => o[c] = all(c)); await saveFile(`backup-gestao-agro-${today()}.json`, JSON.stringify(o, null, 1)); };
ACTIONS["wipe"] = async () => {
  if (Store.isAdmin === false) { toast("Somente administradores podem apagar os dados da fazenda.", true); return; }
  const ok = await confirmBox("Apagar <b>todos</b> os dados do sistema? Cadastros, lançamentos, estoques e orçamentos serão removidos para todos os usuários.", "Apagar tudo"); if (!ok) return;
  const ops = []; COLS.forEach(c => all(c).forEach(x => ops.push({ op: "del", col: c, id: x.id })));
  showProgress("Apagando dados…"); await Store.bulk(ops, p => setProgress(p)); hideProgress(); location.hash = "#painel"; render(false); toast("Dados apagados");
};

/* ---------- boas-vindas e carga inicial ---------- */
function viewWelcome() {
  if (!Store.canWrite) return `<div class="welcome"><h2>Sistema ainda não implantado</h2><p>O responsável pela fazenda precisa fazer a implantação inicial. Seu acesso é somente leitura.</p></div>`;
  return `<div class="welcome"><div><h2>Implantação da gestão da fazenda</h2><p>Escolha como começar. Você pode explorar uma fazenda de exemplo com café, pimenta-do-reino, soja e milho, ou implantar direto com os dados da sua propriedade.</p></div>
  <div class="choice"><div class="panel"><h3>Explorar uma fazenda de exemplo</h3><ul><li>Duas safras de lançamentos, vendas e colheitas fictícios</li><li>Estoque de insumos com compras e aplicações por talhão</li><li>Financiamentos, patrimônio e orçamento preenchidos</li></ul><p class="note" style="margin:0">Dados fictícios. Apague tudo em Configurações quando for implantar a sua fazenda.</p><div><button class="btn pri" data-act="demo">Carregar fazenda de exemplo</button></div></div>
  <div class="panel"><h3>Implantar minha fazenda</h3><ul><li>Cria o plano de contas gerencial padrão</li><li>Cria as culturas café, pimenta-do-reino, soja, milho e feijão</li><li>Depois cadastre talhões, safras, insumos e saldos iniciais</li></ul><div style="margin-top:auto"><button class="btn" data-act="start">Começar do zero</button></div></div></div>
  <div id="progressBox" hidden><div class="note" id="progressTxt"></div><div class="progress"><div id="progressBar"></div></div></div></div>`;
}
function showProgress(t) { const b = $("#progressBox"); if (b) { b.hidden = false; $("#progressTxt").textContent = t; } else { openModal("Processando", `<div class="note" id="progressTxt">${esc(t)}</div><div class="progress"><div id="progressBar"></div></div>`); } }
function setProgress(p) { const b = $("#progressBar"); if (b) b.style.width = Math.round(p * 100) + "%"; }
function hideProgress() { const b = $("#progressBox"); if (b) b.hidden = true; else closeModal(); }
async function seedBase() {
  const ops = DEFAULT_CATEGORIAS.filter(c => !get("categorias", c.id)).map(c => ({ op: "put", col: "categorias", obj: { ...c } }));
  const cults = [["cu_cafe", "Café arábica", "sc", 60, 1650, "perene"], ["cu_pimenta", "Pimenta-do-reino", "kg", 1, 12.5, "perene"], ["cu_soja", "Soja", "sc", 60, 122, "anual"], ["cu_milho", "Milho", "sc", 60, 58, "anual"], ["cu_feijao", "Feijão", "sc", 60, 230, "anual"]];
  if (!all("culturas").length) cults.forEach(([id, nome, unidade, kgUnidade, precoRef, tipo]) => ops.push({ op: "put", col: "culturas", obj: { id, nome, unidade, kgUnidade, precoRef, tipo } }));
  if (ops.length) await Store.bulk(ops);
}
ACTIONS["start"] = () => cfgForm(true);
ACTIONS["demo"] = async (_, btn) => { btn.disabled = true; showProgress("Gerando fazenda de exemplo…"); const ops = buildDemo(); setProgress(0.02); $("#progressTxt").textContent = `Gravando ${ops.length} registros…`; await Store.bulk(ops, p => setProgress(p)); hideProgress(); toast("Fazenda de exemplo carregada"); initPeriod(); render(false); };
/* ================= RELATÓRIOS ================= */
const RS = { dreModo: "total", dreDet: true, fluxoTab: "direto", estTab: "posicao", kardexIns: "", compTab: "dre", prodSafra: "", orcSafra: "", compSafra: "", horizonte: 6 };
ACTIONS["rs"] = (key, el) => { const v = el.dataset.val !== undefined ? el.dataset.val : (el.type === "checkbox" ? el.checked : el.value); RS[key] = v; render(); };
const seg = (key, options) => `<div class="seg" role="group">${options.map(([v, l]) => `<button data-act="rs" data-id="${key}" data-val="${esc(v)}" class="${String(RS[key]) === String(v) ? "on" : ""}">${esc(l)}</button>`).join("")}</div>`;
const tabs = (key, options) => `<div class="tabs" role="tablist">${options.map(([v, l]) => `<button role="tab" data-act="rs" data-id="${key}" data-val="${esc(v)}" class="${RS[key] === v ? "on" : ""}">${esc(l)}</button>`).join("")}</div>`;
ACTIONS["rs-sel"] = (key, el) => { RS[key] = el.value; render(); };
const cell = (v, opts = {}) => `<td class="n ${signCls(v)}">${opts.blank && Math.abs(v) < 0.005 ? "–" : brl0(v)}</td>`;
const cellPct = v => `<td class="n muted">${isFinite(v) ? pct(v) : "–"}</td>`;
function safraColhida() { const e = E(); const hs = e.safras.filter(s => s.inicio <= P.to && e.colheitas.some(h => h.safraId === s.id)); return hs.length ? hs[hs.length - 1].id : currentSafraId(); }
function currentSafraId() { const e = E(); const s = e.safras.find(s => P.to >= s.inicio && P.to <= s.fim) || e.safras[e.safras.length - 1]; return s ? s.id : ""; }

/* ---------- linhas da DRE ---------- */
function dreLinhas(d) {
  const L = []; const det = (g, sign) => [...d.lines[g].porCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ l: nomeCat(c), v: sign * v, cls: "det" }));
  L.push({ l: "(=) Receita bruta", v: d.rb, cls: "sum", k: "rb" }, ...det("receita", 1));
  L.push({ l: "(−) Deduções da receita", v: -d.ded, k: "ded" }, ...det("deducao", -1));
  L.push({ l: "(=) Receita líquida", v: d.rl, cls: "big", k: "rl" });
  L.push({ l: "(−) Custo dos produtos vendidos (CMV)", v: -d.custoTotal, k: "cmv" }, ...[...d.cmvCult.entries()].map(([c, v]) => ({ l: c === "_plan" ? "Custos de produção orçados" : "CMV · " + nomeCult(c), v: -v, cls: "det" })), ...(Math.abs(d.perdas) > 0.004 ? [{ l: "Perdas e ajustes de estoque de insumos", v: -d.perdas, cls: "det" }] : []));
  L.push({ l: "(=) Lucro bruto", v: d.lb, cls: "big", k: "lb" });
  L.push({ l: "(−) Despesas comerciais", v: -d.com, k: "com" }, ...det("comercial", -1));
  L.push({ l: "(−) Despesas gerais e administrativas", v: -d.adm, k: "adm" }, ...det("administrativa", -1), ...(d.admIns > 0.004 ? [{ l: "Insumos consumidos na sede", v: -d.admIns, cls: "det" }] : []));
  L.push({ l: "(=) Lucro operacional (EBITDA)", v: d.ebitda, cls: "big", k: "ebitda" });
  L.push({ l: "(−) Depreciação e amortização", v: -d.dep, k: "dep" });
  L.push({ l: "(=) Lucro antes do resultado financeiro (EBIT)", v: d.ebit, cls: "big", k: "ebit" });
  L.push({ l: "(+) Receitas financeiras", v: d.rf, k: "rf" }, ...det("rec_fin", 1));
  L.push({ l: "(−) Despesas financeiras", v: -d.df, k: "df" }, ...det("desp_fin", -1));
  L.push({ l: "(=) Lucro antes do IRPJ e CSLL", v: d.lair, cls: "big", k: "lair" });
  L.push({ l: "(−) IRPJ e CSLL", v: -d.ir, k: "ir" });
  L.push({ l: "(=) Lucro líquido", v: d.ll, cls: "big", k: "ll" });
  return L;
}
function dreTable(cols, labels, opts = {}) {
  // cols: array of dre objects; mescla linhas por rótulo
  const linhas = cols.map(d => dreLinhas(d)); const order = []; const seen = new Set();
  // ordem: linhas principais da primeira coluna com detalhes de todas as colunas
  const mains = linhas[0].filter(x => x.cls !== "det").map(x => x.k);
  mains.forEach(k => {
    const main = linhas[0].find(x => x.k === k); order.push(main);
    if (RS.dreDet) { const dets = []; linhas.forEach(ls => { const i = ls.findIndex(x => x.k === k); for (let j = i + 1; j < ls.length && ls[j].cls === "det"; j++) if (!seen.has(k + ls[j].l)) { seen.add(k + ls[j].l); dets.push({ ...ls[j], k: k + "::" + ls[j].l }); } }); order.push(...dets); }
  });
  const val = (ci, row) => { const ls = linhas[ci]; if (!row.k.includes("::")) return (ls.find(x => x.k === row.k) || {}).v || 0; const [k, l] = row.k.split("::"); const i = ls.findIndex(x => x.k === k); for (let j = i + 1; j < ls.length && ls[j].cls === "det"; j++) if (ls[j].l === l) return ls[j].v; return 0; };
  const th = `<tr><th>Conta</th>${labels.map(l => `<th class="n">${esc(l)}</th>`).join("")}${opts.av ? `<th class="n">AV %</th>` : ""}${opts.hv ? `<th class="n">Variação</th>` : ""}</tr>`;
  const body = order.map(row => `<tr class="${row.cls || ""}"><td>${esc(row.l)}</td>${cols.map((_, ci) => cell(val(ci, row), { blank: row.cls === "det" })).join("")}${opts.av ? cellPct(ratio(val(cols.length - 1, row), cols[cols.length - 1].rl)) : ""}${opts.hv ? (() => { const a = val(0, row), z = val(cols.length - 1, row); return `<td class="n ${z - a < 0 ? "neg" : ""}">${Math.abs(a) > 0.5 ? pct((z - a) / Math.abs(a)) : "–"}</td>`; })() : ""}</tr>`).join("");
  return `<div class="tw" data-table="${opts.id || "dre"}"><table class="t compact">${`<thead>${th}</thead>`}<tbody>${body}</tbody></table></div>`;
}

route("dre", "DRE gerencial", () => {
  const d = dre(P.from, P.to); let tableHtml, chart = "";
  if (RS.dreModo === "mensal") {
    const ms = monthsInRange(P.from, P.to < today() ? P.to : today()); const ds = ms.map(k => { const [a, b] = clampRange(k, P.from, P.to); return dre(a, b); });
    tableHtml = dreTable(ds.concat([d]), ms.map(fmtM).concat(["Total"]), { id: "dre", av: true });
    chart = panel("Evolução mensal", barChart({ labels: ms.map(fmtM), series: [{ name: "Receita líquida", values: ds.map(x => x.rl), color: "var(--s1)" }, { name: "EBITDA", values: ds.map(x => x.ebitda), color: "var(--s3)" }, { name: "Lucro líquido", values: ds.map(x => x.ll), color: "var(--s7)", line: true }] }));
  } else if (RS.dreModo === "cultura") {
    const e = E(); const cs = [...new Set(e.vendas.filter(v => v.competencia >= P.from && v.competencia <= P.to).map(v => v.culturaId))];
    const rows = cs.map(c => {
      const vs = e.vendas.filter(v => v.culturaId === c && v.competencia >= P.from && v.competencia <= P.to); const rb = sum(vs, v => v.valor);
      const ded = sum(e.lancs.filter(l => l.culturaId === c && e.grupoOf(l.categoriaId) === "deducao" && l.competencia >= P.from && l.competencia <= P.to), l => num(l.valor));
      const com = sum(e.lancs.filter(l => l.culturaId === c && e.grupoOf(l.categoriaId) === "comercial" && l.competencia >= P.from && l.competencia <= P.to), l => num(l.valor));
      const cmv = sum(vs, v => v.cmv), cmvVar = sum(vs, v => v.cmvVar); const rl = rb - ded; const q = sum(vs, v => v.qtd);
      return { c, q, rb, ded, rl, cmv, lb: rl - cmv, com, mc: rl - cmvVar - com, contrib: rl - cmv - com };
    });
    const tot = k => sum(rows, r => r[k]);
    CSV.delete("dre");
    tableHtml = table([
      { h: "Cultura", f: r => `<b>${esc(nomeCult(r.c))}</b>`, foot: () => "Total" }, { h: "Qtd. vendida", n: 1, f: r => nf(r.q, 1) + " " + esc(unCult(r.c)) },
      { h: "Receita bruta", n: 1, f: r => brl0(r.rb), foot: () => brl0(tot("rb")) }, { h: "Deduções", n: 1, f: r => brl0(-r.ded), foot: () => brl0(-tot("ded")) }, { h: "Receita líquida", n: 1, f: r => brl0(r.rl), foot: () => brl0(tot("rl")) },
      { h: "CMV", n: 1, f: r => brl0(-r.cmv), foot: () => brl0(-tot("cmv")) }, { h: "Lucro bruto", n: 1, f: r => brl0(r.lb), foot: () => brl0(tot("lb")) }, { h: "Margem bruta", n: 1, f: r => pct(ratio(r.lb, r.rl)), foot: () => pct(ratio(tot("lb"), tot("rl"))) },
      { h: "Desp. comerciais", n: 1, f: r => brl0(-r.com), foot: () => brl0(-tot("com")) }, { h: "Margem de contribuição", n: 1, f: r => brl0(r.mc), foot: () => brl0(tot("mc")) }, { h: "MC %", n: 1, f: r => pct(ratio(r.mc, r.rl)), foot: () => pct(ratio(tot("mc"), tot("rl"))) },
      { h: "Contribuição ao resultado", n: 1, f: r => `<b class="${signCls(r.contrib)}">${brl0(r.contrib)}</b>`, foot: () => brl0(tot("contrib")) }
    ], rows, { id: "dre", foot: {}, empty: "Nenhuma venda com cultura no período." }) + `<div class="panel-b note">Despesas administrativas (${brl0(d.adm)}), depreciação (${brl0(d.dep)}), resultado financeiro (${brl0(d.rf - d.df)}) e IR (${brl0(d.ir)}) são da estrutura da fazenda e não são distribuídos entre culturas.</div>`;
    chart = panel("Contribuição por cultura", hbars(rows.map((r, i) => ({ label: nomeCult(r.c), value: r.contrib, color: SERIES[i % 8], extra: [["Margem bruta", pct(ratio(r.lb, r.rl))]] }))));
  } else {
    const ini = addDays(P.from, -1); const dur = daysBetween(P.from, P.to); const ant = dre(addDays(ini, -dur), ini);
    tableHtml = dreTable([ant, d], ["Período anterior", "Período atual"], { id: "dre", av: true, hv: true });
    const wf = [["Receita líquida", d.rl], ["CMV", -d.custoTotal], ["Comerciais", -d.com], ["Administrativas", -d.adm], ["Depreciação", -d.dep], ["Financeiro", d.rf - d.df], ["IR/CSLL", -d.ir]];
    chart = panel("Da receita ao lucro", hbars(wf.map(([l, v]) => ({ label: l, value: v, color: v >= 0 ? "var(--s1)" : "var(--s2)", txt: brl0(v) })).concat([{ label: "Lucro líquido", value: d.ll, color: "var(--s3)", txt: brl0(d.ll) }])), { sub: "Valores do período atual" });
  }
  return `<div class="kpis">${kpi("Receita líquida", brl0(d.rl), "Receita bruta " + brl0(d.rb))}${kpi("Margem bruta", pct(ratio(d.lb, d.rl)), "Lucro bruto " + brl0(d.lb))}${kpi("EBITDA", brl0(d.ebitda), "Margem " + pct(ratio(d.ebitda, d.rl)))}${kpi("Lucro líquido", brl0(d.ll), "Margem " + pct(ratio(d.ll, d.rl)), "hero")}${kpi("Margem de contribuição", pct(d.mcPct), brl0(d.mc))}</div>
  ${panel("Demonstração do resultado", tableHtml, { sub: `Regime de competência · ${periodTxt()}`, flush: true, tools: `<div class="toolbar">${seg("dreModo", [["total", "Comparativo"], ["mensal", "Mensal"], ["cultura", "Por cultura"]])}${RS.dreModo !== "cultura" ? `<label class="chk"><input type="checkbox" data-act="rs" data-id="dreDet" ${RS.dreDet ? "checked" : ""}> Detalhar contas</label>` : ""}${csvBtn("dre", "dre-gerencial")}</div>` })}
  ${chart}`;
}, { period: true });

/* ---------- Fluxo de caixa ---------- */
const FLUXO_LINHAS = [
  ["receita", "(+) Recebimentos de vendas e receitas"], ["deducao", "(−) Impostos e deduções sobre vendas"], ["custo", "(−) Custos de produção"], ["compra_insumo", "(−) Compras de insumos"],
  ["comercial", "(−) Despesas comerciais"], ["administrativa", "(−) Despesas administrativas"], ["rec_fin", "(+) Receitas financeiras"], ["desp_fin", "(−) Juros e despesas financeiras"], ["ir", "(−) IRPJ e CSLL"],
  ["=op", "(=) Fluxo de caixa operacional"], ["investimento", "(−) Aquisição de imobilizado e investimentos"], ["=inv", "(=) Fluxo de caixa de investimentos"],
  ["captacao", "(+) Captação de empréstimos"], ["amortizacao", "(−) Amortização de empréstimos"], ["aporte", "(+) Aportes de capital"], ["distribuicao", "(−) Distribuição de lucros / retiradas"], ["=fin", "(=) Fluxo de caixa de financiamentos"]
];
/* fluxo por mês: realizado até hoje + (opcional) títulos em aberto pela data de vencimento (atrasados entram no mês atual) */
function fluxoMensal(from, to, projetar) {
  const e = E(); const h = today(); const ms = monthsInRange(from, to);
  const cols = ms.map(k => { const [a, b] = clampRange(k, from, to); const o = { k, a, b, g: {}, proj: projetar && b >= h, real: a <= h }; Object.keys(GRUPOS).forEach(g => o.g[g] = 0); return o; });
  const colOf = d => cols.find(c => d >= c.a && d <= c.b);
  let pre = 0;
  for (const l of e.lancs) {
    const g = e.grupoOf(l.categoriaId); if (!GRUPOS[g]) continue; const v = signedVal(l);
    if (l.pagamento) { const c = colOf(l.pagamento); if (c) c.g[g] += v; }
    else if (projetar) { const d = (l.vencimento || l.competencia) < h ? h : (l.vencimento || l.competencia); if (d < from && d >= h) pre += v; const c = colOf(d); if (c) c.g[g] += v; }
  }
  let saldo = caixaEm(addDays(from, -1)) + pre;
  cols.forEach(c => {
    c.ini = saldo; c.op = sum(Object.keys(GRUPOS).filter(g => GRUPOS[g].fluxo === "op"), g => c.g[g]); c.inv = c.g.investimento; c.fin = sum(FIN_GRUPOS, g => c.g[g]);
    c.implant = (e.abertura >= c.a && e.abertura <= c.b) ? num(e.C.caixaInicial) : 0;
    c.liq = c.op + c.inv + c.fin; c.fim = c.ini + c.implant + c.liq; saldo = c.fim;
  });
  return cols;
}
function fluxoTable(cols, labels, id) {
  const tot = { g: {}, op: sum(cols, c => c.op), inv: sum(cols, c => c.inv), fin: sum(cols, c => c.fin), liq: sum(cols, c => c.liq), ini: cols[0].ini, fim: cols[cols.length - 1].fim, implant: sum(cols, c => c.implant) };
  Object.keys(GRUPOS).forEach(g => tot.g[g] = sum(cols, c => c.g[g]));
  const all2 = cols.concat([tot]);
  const row = (l, f, cls = "") => `<tr class="${cls}"><td>${esc(l)}</td>${all2.map(c => cell(f(c), { blank: cls === "det" })).join("")}</tr>`;
  let body = row("Saldo inicial de caixa", c => c.ini, "sec");
  FLUXO_LINHAS.forEach(([k, l]) => {
    if (k.startsWith("=")) body += row(l, c => c[k.slice(1)], "big");
    else if (all2.some(c => Math.abs(c.g[k]) > 0.004)) body += row(l, c => c.g[k], "det");
  });
  body += row("(=) Variação líquida de caixa", c => c.liq, "sum");
  if (Math.abs(tot.implant) > 0.004) body += row("(+) Saldo de implantação", c => c.implant, "det");
  body += row("Saldo final de caixa", c => c.fim, "big");
  return `<div class="tw" data-table="${id}"><table class="t compact"><thead><tr><th>Atividade</th>${labels.map(l => `<th class="n">${l}</th>`).join("")}<th class="n">Total</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
route("fluxo", "Fluxo de caixa", () => {
  const h = today(); let out = "";
  if (RS.fluxoTab === "indireto") {
    const ind = dfcIndireto(P.from, P.to); const dir = dfcDireto(P.from, P.to);
    const rows = ind.items.map(([l, v], i) => `<tr class="${i === 0 ? "" : "det"}"><td>${esc(l)}</td>${cell(v)}</tr>`).join("");
    const diff = ind.op - dir.op;
    out = panel("Demonstração dos fluxos de caixa — método indireto", `<div class="tw" data-table="dfc-ind"><table class="t compact"><thead><tr><th>Atividade</th><th class="n">${periodTxt()}</th></tr></thead><tbody>
      <tr class="sec"><td colspan="2">Atividades operacionais</td></tr>${rows}<tr class="big"><td>(=) Caixa gerado pelas operações</td>${cell(ind.op)}</tr>
      <tr class="sec"><td colspan="2">Atividades de investimento</td></tr><tr class="det"><td>Aquisição de imobilizado e investimentos</td>${cell(dir.g.investimento.total)}</tr><tr class="big"><td>(=) Caixa das atividades de investimento</td>${cell(dir.inv)}</tr>
      <tr class="sec"><td colspan="2">Atividades de financiamento</td></tr>${FIN_GRUPOS.map(g => `<tr class="det"><td>${esc(GRUPOS[g].nome)}</td>${cell(dir.g[g].total)}</tr>`).join("")}<tr class="big"><td>(=) Caixa das atividades de financiamento</td>${cell(dir.fin)}</tr>
      <tr class="sum"><td>(=) Variação líquida de caixa</td>${cell(ind.op + dir.inv + dir.fin)}</tr><tr><td>Saldo inicial</td>${cell(dir.ini)}</tr>${dir.implant ? `<tr><td>(+) Saldo de implantação</td>${cell(dir.implant)}</tr>` : ""}<tr class="big"><td>Saldo final</td>${cell(dir.ini + dir.implant + ind.op + dir.inv + dir.fin)}</tr>
      </tbody></table></div><div class="panel-b note">Conciliação com o método direto: caixa operacional direto ${brl(dir.op)} · ${Math.abs(diff) < 1 ? `<span class="check-ok">conciliado</span>` : `<span class="check-bad">diferença ${brl(diff)}</span>`}</div>`, { sub: "Parte do lucro líquido e ajusta itens sem efeito caixa e a variação do capital de giro", flush: true, tools: csvBtn("dfc-ind", "fluxo-caixa-indireto") });
  } else {
    const proj = RS.fluxoTab === "projetado";
    let from = P.from, to = P.to; if (proj) { from = monthStart(addMonths(h, -2)); to = monthEnd(addMonths(h, num(RS.horizonte) - 1)); }
    const cols = fluxoMensal(from, to, proj);
    const labels = cols.map(c => fmtM(c.k) + (proj ? `<br><span class="muted" style="font-weight:500;text-transform:none">${c.b < h ? "realizado" : c.a > h ? "projetado" : "real + proj."}</span>` : ""));
    const minSaldo = Math.min(...cols.map(c => c.fim)); const minCol = cols.find(c => c.fim === minSaldo);
    out = (proj ? `<div class="kpis">${kpi("Saldo hoje", brl0(caixaEm(h)), "Caixa e bancos")}${kpi("A receber (aberto)", brl0(sum(E().lancs.filter(l => !l.pagamento && signedVal(l) > 0 && !FIN_GRUPOS.includes(E().grupoOf(l.categoriaId))), l => num(l.valor))), "Inclui atrasados")}${kpi("A pagar (aberto)", brl0(sum(E().lancs.filter(l => !l.pagamento && signedVal(l) < 0), l => num(l.valor))), "Inclui parcelas de financiamentos")}${kpi("Menor saldo projetado", brl0(minSaldo), minSaldo < 0 ? pill("Necessidade de caixa em " + fmtM(minCol.k), "bad") : pill("Sem saldo negativo", "good"))}</div>` : "")
      + panel(proj ? "Fluxo de caixa projetado" : "Demonstração dos fluxos de caixa — método direto", fluxoTable(cols, labels, "dfc"), { sub: proj ? "Meses passados pelo realizado; meses futuros pelos títulos em aberto por vencimento (atrasados no mês atual)" : `Regime de caixa por data de pagamento · ${periodTxt()}`, flush: true, tools: `<div class="toolbar">${proj ? `<select class="inp sm" data-act="rs-sel" data-id="horizonte" aria-label="Horizonte">${opt([["3", "3 meses à frente"], ["6", "6 meses à frente"], ["12", "12 meses à frente"], ["18", "18 meses à frente"]], RS.horizonte)}</select>` : ""}${csvBtn("dfc", proj ? "fluxo-caixa-projetado" : "fluxo-caixa-direto")}</div>` })
      + `<div class="grid g2">${panel("Entradas e saídas por mês", barChart({ labels: cols.map(c => fmtM(c.k)), series: [{ name: "Entradas", values: cols.map(c => sum(Object.keys(GRUPOS), g => Math.max(0, c.g[g]))), color: "var(--s1)" }, { name: "Saídas", values: cols.map(c => sum(Object.keys(GRUPOS), g => Math.min(0, c.g[g]))), color: "var(--s2)" }] }))}
        ${panel("Saldo de caixa no fim do mês", barChart({ labels: cols.map(c => fmtM(c.k)), series: [{ name: "Saldo final", values: cols.map(c => c.fim), color: "var(--s3)" }] }))}</div>`;
  }
  return `${tabs("fluxoTab", [["direto", "Realizado (direto)"], ["indireto", "Método indireto"], ["projetado", "Projetado"]])}${out}`;
}, { period: true });

/* ---------- Balanço patrimonial ---------- */
route("balanco", "Balanço patrimonial", () => {
  const D1 = P.to < today() ? P.to : today(), D0 = addDays(P.from, -1); const b = balanco(D1), a = balanco(D0);
  const r = (l, f, cls = "") => { const v1 = f(b), v0 = f(a); return `<tr class="${cls}"><td>${esc(l)}</td>${cell(v1, { blank: cls === "det" })}<td class="n muted">${cls === "det" && Math.abs(v1) < .5 ? "" : pct(ratio(v1, b.at))}</td>${cell(v0, { blank: cls === "det" })}<td class="n ${signCls(v1 - v0)}">${Math.abs(v1 - v0) < .5 ? "–" : brl0(v1 - v0)}</td></tr>`; };
  const sec = l => `<tr class="sec"><td colspan="5">${esc(l)}</td></tr>`;
  const imobTipos = [...new Set([...b.imobPor.keys(), ...a.imobPor.keys()])];
  const ativo = sec("Ativo") + r("Ativo circulante", x => x.ac, "sum") + r("Caixa e equivalentes de caixa", x => x.caixa, "det") + r("Contas a receber de clientes", x => x.ar, "det") + r("Adiantamentos a fornecedores", x => x.advForn + x.advInv, "det") + r("Estoque de insumos", x => x.estIns, "det") + r("Estoque de produtos agrícolas", x => x.estProd, "det") + r("Lavouras em formação / custos da safra em andamento", x => x.wip, "det")
    + r("Ativo não circulante", x => x.anc, "sum") + imobTipos.map(t => r(t, x => x.imobPor.get(t) || 0, "det")).join("") + r("(−) Depreciação acumulada", x => -x.depAc, "det") + r("Total do ativo", x => x.at, "big");
  const passivo = sec("Passivo e patrimônio líquido") + r("Passivo circulante", x => x.pc, "sum") + r("Fornecedores e contas a pagar", x => x.apForn, "det") + r("Obrigações fiscais", x => x.apFisc, "det") + r("Adiantamentos de clientes", x => x.advCli, "det") + r("Empréstimos e financiamentos (curto prazo)", x => x.emprestCP, "det") + r("Contas a pagar de investimentos (curto prazo)", x => x.apInvCP, "det")
    + r("Passivo não circulante", x => x.pnc, "sum") + r("Empréstimos e financiamentos (longo prazo)", x => x.emprestLP, "det") + r("Contas a pagar de investimentos (longo prazo)", x => x.apInvLP, "det")
    + r("Patrimônio líquido", x => x.pl, "sum") + r("Capital social", x => x.capital, "det") + r("Reservas e lucros na implantação", x => x.reservasAbertura, "det") + r("Aportes de capital", x => x.aportes, "det") + r("(−) Distribuições e retiradas", x => -x.distrib, "det") + r("Lucros (prejuízos) acumulados de anos anteriores", x => x.resAnteriores, "det") + r("Resultado do exercício corrente", x => x.resExercicio, "det")
    + r("Total do passivo e patrimônio líquido", x => x.pt, "big");
  const ok = Math.abs(b.diff) < 1 && Math.abs(a.diff) < 1;
  const est = x => x.estIns + x.estProd + x.wip;
  return `<div class="kpis">${kpi("Ativo total", brl0(b.at), "")}${kpi("Patrimônio líquido", brl0(b.pl), pct(ratio(b.pl, b.at)) + " do ativo", "hero")}${kpi("Capital de giro líquido", brl0(b.ac - b.pc), "AC − PC")}${kpi("Liquidez corrente", nf(ratio(b.ac, b.pc), 2), "Seca " + nf(ratio(b.ac - est(b), b.pc), 2))}${kpi("Endividamento geral", pct(ratio(b.pc + b.pnc, b.at)), "Passivo ÷ ativo")}</div>
  ${panel("Balanço patrimonial gerencial", `<div class="tw" data-table="bp"><table class="t compact"><thead><tr><th>Conta</th><th class="n">${fmtD(D1)}</th><th class="n">AV %</th><th class="n">${fmtD(D0)}</th><th class="n">Variação</th></tr></thead><tbody>${ativo}${passivo}</tbody></table></div>
  <div class="panel-b note">${ok ? `<span class="check-ok">Ativo = Passivo + PL nas duas datas.</span>` : `<span class="check-bad">Diferença de fechamento: ${brl(b.diff)}. Verifique lançamentos de compras ou bens editados fora da origem.</span>`} Estoques de produtos valorizados ao custo de produção da safra; insumos ao custo médio.</div>`, { sub: `Posição em ${fmtD(D1)} comparada ao início do período`, flush: true, tools: csvBtn("bp", "balanco-patrimonial") })}`;
}, { period: true });

/* ---------- Indicadores ---------- */
function semaforo(v, good, warn, higherBetter = true) { if (!isFinite(v)) return ""; const g = higherBetter ? v >= good : v <= good; const w = higherBetter ? v >= warn : v <= warn; return g ? pill("Saudável", "good") : w ? pill("Atenção", "warn") : pill("Crítico", "bad"); }
route("indicadores", "Indicadores", () => {
  const I = indicadores(P.from, P.to); const d = I.d; const b = I.b;
  const card = (t, items) => panel(t, `<table class="t compact"><tbody>${items.map(([l, v, s, f]) => `<tr><td>${esc(l)}${f ? `<div class="note">${esc(f)}</div>` : ""}</td><td class="n"><b>${v}</b></td><td class="n">${s || ""}</td></tr>`).join("")}</tbody></table>`, { flush: true });
  const dias = v => isFinite(v) ? nf(v, 0) + " dias" : "—";
  const sid = safraColhida(); const pr = sid ? producaoSafra(sid) : { culturas: [] };
  return `<div class="kpis">${kpi("Margem EBITDA", pct(I.margemEbitda), brl0(d.ebitda))}${kpi("Lucro líquido", brl0(d.ll), "Margem " + pct(I.margemLiquida), "hero")}${kpi("Caixa operacional", brl0(I.fco), "Conversão " + pct(I.conversaoCaixa) + " do EBITDA")}${kpi("Dívida líq. / EBITDA", isFinite(I.divLiqEbitda) ? nf(I.divLiqEbitda, 2) + "x" : "—", "EBITDA anualizado")}${kpi("Ciclo de conversão de caixa", dias(I.ccc), "PMRE + PMR − PMP")}</div>
  <div class="grid g2">
  ${card("Rentabilidade e margens", [
    ["Margem bruta", pct(I.margemBruta), semaforo(I.margemBruta, .3, .15), "Lucro bruto ÷ receita líquida"],
    ["Margem de contribuição", pct(I.margemContrib), semaforo(I.margemContrib, .35, .2), "(Receita líquida − custos e despesas variáveis) ÷ receita líquida"],
    ["Margem EBITDA", pct(I.margemEbitda), semaforo(I.margemEbitda, .25, .1), "EBITDA ÷ receita líquida"],
    ["Margem operacional (EBIT)", pct(I.margemOper), "", "EBIT ÷ receita líquida"],
    ["Margem líquida", pct(I.margemLiquida), semaforo(I.margemLiquida, .12, .03), "Lucro líquido ÷ receita líquida"],
    ["Lucro líquido", brl0(d.ll), "", ""],
    ["Retorno sobre o PL (ROE)", pct(I.roe), "", "Lucro do período ÷ PL médio"],
    ["Retorno sobre o ativo (ROA)", pct(I.roa), "", "Lucro do período ÷ ativo médio"]])}
  ${card("Ponto de equilíbrio", [
    ["Custos e despesas variáveis", brl0(d.cv), "", "CMV variável, perdas, despesas variáveis"],
    ["Custos e despesas fixos", brl0(d.cf), "", "Mão de obra fixa, manutenção, arrendamento, administração…"],
    ["Margem de contribuição", brl0(d.mc), "", ""],
    ["Ponto de equilíbrio contábil", isFinite(d.peContabil) ? brl0(d.peContabil) : "—", isFinite(d.peContabil) ? (d.rl >= d.peContabil ? pill("Acima do PE", "good") : pill("Abaixo do PE", "bad")) : "", "(Fixos + depreciação) ÷ MC%"],
    ["Ponto de equilíbrio financeiro", isFinite(d.peFinanceiro) ? brl0(d.peFinanceiro) : "—", "", "Fixos desembolsáveis ÷ MC%"],
    ["Margem de segurança", isFinite(d.peContabil) ? pct((d.rl - d.peContabil) / d.rl) : "—", "", "(Receita líquida − PE) ÷ receita líquida"]])}
  ${card("Liquidez (" + fmtD(b.D) + ")", [
    ["Liquidez corrente", nf(I.liqCorrente, 2), semaforo(I.liqCorrente, 1.5, 1), "Ativo circulante ÷ passivo circulante"],
    ["Liquidez seca", nf(I.liqSeca, 2), semaforo(I.liqSeca, 1, .6), "(AC − estoques) ÷ PC"],
    ["Liquidez imediata", nf(I.liqImediata, 2), "", "Caixa ÷ PC"],
    ["Liquidez geral", nf(I.liqGeral, 2), semaforo(I.liqGeral, 1, .7), "AC ÷ (PC + PNC)"],
    ["Capital de giro líquido", brl0(b.ac - b.pc), "", "AC − PC"]])}
  ${card("Endividamento e estrutura", [
    ["Endividamento geral", pct(I.endivGeral), semaforo(I.endivGeral, .4, .6, false), "(PC + PNC) ÷ ativo total"],
    ["Composição do endividamento", pct(I.composicao), semaforo(I.composicao, .4, .6, false), "PC ÷ (PC + PNC)"],
    ["Participação de capital de terceiros", pct(I.capTerceiros), "", "(PC + PNC) ÷ PL"],
    ["Imobilização do PL", pct(I.imobPL), "", "Ativo não circulante ÷ PL"],
    ["Dívida bruta", brl0(I.divida), "", "Empréstimos e financiamentos"],
    ["Dívida líquida", brl0(I.divLiq), "", "Dívida − caixa"],
    ["Dívida líquida ÷ EBITDA", isFinite(I.divLiqEbitda) ? nf(I.divLiqEbitda, 2) + "x" : "—", semaforo(I.divLiqEbitda, 2, 3.5, false), "EBITDA anualizado pelo período"],
    ["Cobertura de juros", isFinite(I.coberturaJuros) ? nf(I.coberturaJuros, 1) + "x" : "—", semaforo(I.coberturaJuros, 4, 2), "EBITDA ÷ despesas financeiras"]])}
  ${card("Geração de caixa", [
    ["Geração de caixa operacional (FCO)", brl0(I.fco), I.fco >= 0 ? pill("Positiva", "good") : pill("Negativa", "bad"), "Recebimentos − pagamentos operacionais"],
    ["Investimentos (FCI)", brl0(I.f.inv), "", ""],
    ["Fluxo de caixa livre", brl0(I.fcl), "", "FCO + FCI"],
    ["Financiamentos (FCF)", brl0(I.f.fin), "", ""],
    ["Geração de caixa líquida", brl0(I.geracaoLiq), "", "Variação do caixa no período"],
    ["Conversão de EBITDA em caixa", pct(I.conversaoCaixa), "", "FCO ÷ EBITDA"]])}
  ${card("Ciclo de conversão de caixa", [
    ["Prazo médio de estocagem (PMRE)", dias(I.pmre), "", "Estoques médios (insumos, produtos, lavouras) ÷ CMV × dias"],
    ["Prazo médio de recebimento (PMR)", dias(I.pmr), "", "Contas a receber médias ÷ receita bruta × dias"],
    ["Prazo médio de pagamento (PMP)", dias(I.pmp), "", "Fornecedores médios ÷ compras e despesas × dias"],
    ["Ciclo de conversão de caixa", dias(I.ccc), "", "PMRE + PMR − PMP"],
    ["Dias no período", nf(I.dias, 0), "", ""]])}
  </div>
  ${pr.culturas.length ? panel("Indicadores de produção · safra " + esc(pr.safra.nome), table([
    { h: "Cultura", f: c => `<b>${esc(c.c.nome)}</b>` }, { h: "Área", n: 1, f: c => nf(c.area, 1) + " ha" }, { h: "Produtividade", n: 1, f: c => isFinite(c.prod) ? nf(c.prod, 1) + " " + esc(c.c.unidade) + "/ha" : "—" },
    { h: "Custo por hectare", n: 1, f: c => brl0(c.custoHa) }, { h: "Custo por unidade", n: 1, f: c => isFinite(c.custoUn) ? brl(c.custoUn) + "/" + esc(c.c.unidade) : "—" }, { h: "Receita por hectare", n: 1, f: c => brl0(ratio(c.receita, c.area)) },
    { h: "Margem por hectare", n: 1, f: c => `<b class="${signCls(c.margemHa)}">${brl0(c.margemHa)}</b>` }, { h: "Equilíbrio", n: 1, f: c => isFinite(c.peHa) ? nf(c.peHa, 1) + " " + esc(c.c.unidade) + "/ha" : "—" }
  ], pr.culturas), { sub: "Custos operacionais de produção apropriados à safra. Detalhes em Produção e custos.", flush: true }) : ""}`;
}, { period: true });

/* ---------- Produção e custos ---------- */
route("producao", "Produção e custos", () => {
  const sid = RS.prodSafra && get("safras", RS.prodSafra) ? RS.prodSafra : safraColhida(); if (!sid) return `<div class="empty"><b>Cadastre uma safra para ver produção e custos.</b></div>`;
  const pr = producaoSafra(sid); const e = E();
  const comp = new Map(); e.costs.filter(x => x.safraId === sid).forEach(x => comp.set(x.catId, (comp.get(x.catId) || 0) + x.v)); const compTot = sum([...comp.values()]);
  const ts = pr.talhoes.filter(t => t.area > 0).sort((a, b) => (b.prod || 0) - (a.prod || 0));
  const histo = e.safras.map(s => ({ s, p: producaoSafra(s.id) }));
  const cultIds = [...new Set(histo.flatMap(h => h.p.culturas.filter(c => c.colhido > 0).map(c => c.culturaId)))];
  return `<div class="toolbar"><label class="note" for="psafra">Safra</label><select class="inp sm" id="psafra" data-act="rs-sel" data-id="prodSafra">${opt(optSafras(), sid)}</select><span class="note">${fmtD(pr.safra.inicio)} a ${fmtD(pr.safra.fim)}</span></div>
  <div class="kpis">${pr.culturas.map(c => kpi(c.c.nome, isFinite(c.prod) && c.colhido ? nf(c.prod, 1) + " " + esc(c.c.unidade) + "/ha" : "Sem colheita", `${nf(c.area, 1)} ha · custo ${brl0(c.custoHa)}/ha · margem ${isFinite(c.margemHa) ? brl0(c.margemHa) : "—"}/ha`)).join("")}</div>
  ${panel("Resultado por cultura", table([
    { h: "Cultura", f: c => `<b>${esc(c.c.nome)}</b>` }, { h: "Área", n: 1, f: c => nf(c.area, 1) + " ha" }, { h: "Produção", n: 1, f: c => nf(c.colhido, 1) + " " + esc(c.c.unidade) },
    { h: "Produtividade", n: 1, f: c => isFinite(c.prod) ? nf(c.prod, 1) + " " + esc(c.c.unidade) + "/ha" : "—" }, { h: "Kg/ha", n: 1, f: c => isFinite(c.prodKg) ? nf(c.prodKg, 0) : "—" }, { h: "t/ha", n: 1, f: c => isFinite(c.prodKg) ? nf(c.prodKg / 1000, 2) : "—" },
    { h: "Custo total", n: 1, f: c => brl0(c.custo) }, { h: "Custo/ha", n: 1, f: c => brl0(c.custoHa) }, { h: "Custo/unidade", n: 1, f: c => isFinite(c.custoUn) ? brl(c.custoUn) : "—" },
    { h: "Preço médio", n: 1, f: c => brl(c.preco) }, { h: "Receita*", n: 1, f: c => brl0(c.receita) }, { h: "Margem/ha", n: 1, f: c => `<b class="${signCls(c.margemHa)}">${isFinite(c.margemHa) ? brl0(c.margemHa) : "—"}</b>` },
    { h: "Margem contrib./un.", n: 1, f: c => isFinite(c.mcUn) ? brl(c.mcUn) : "—" }, { h: "Equilíbrio (un./ha)", n: 1, f: c => isFinite(c.peHa) ? nf(c.peHa, 1) : "—" }
  ], pr.culturas, { id: "prodcult" }) + `<div class="panel-b note">* Receita = produção × preço médio das vendas da safra (ou preço de referência quando ainda não houve venda). Custos incluem insumos aplicados e custos de produção lançados, com rateio por área quando não há talhão.</div>`, { flush: true, tools: csvBtn("prodcult", "producao-por-cultura") })}
  ${panel("Resultado por talhão", table([
    { h: "Talhão", f: t => `<b>${esc(t.nome)}</b>` }, { h: "Cultura", f: t => esc(nomeCult(t.culturaId)) }, { h: "Área", n: 1, f: t => nf(t.area, 1) },
    { h: "Produção", n: 1, f: t => nf(t.colhido, 1) }, { h: "Produtividade", n: 1, f: t => isFinite(t.prod) ? nf(t.prod, 1) + " " + esc(unCult(t.culturaId)) + "/ha" : "—" },
    { h: "Insumos", n: 1, f: t => brl0(t.insumos) }, { h: "Outros custos", n: 1, f: t => brl0(t.custo - t.insumos) }, { h: "Custo/ha", n: 1, f: t => brl0(t.custoHa) }, { h: "Custo/unidade", n: 1, f: t => isFinite(t.custoUn) ? brl(t.custoUn) : "—" },
    { h: "Receita/ha", n: 1, f: t => brl0(t.receitaHa) }, { h: "Margem/ha", n: 1, f: t => `<b class="${signCls(t.margemHa)}">${isFinite(t.margemHa) ? brl0(t.margemHa) : "—"}</b>` }
  ], pr.talhoes, { id: "prodtal" }), { flush: true, tools: csvBtn("prodtal", "producao-por-talhao") })}
  <div class="grid g2">
  ${panel("Produtividade por talhão", [...groupBy(ts.filter(t => t.colhido > 0), t => t.culturaId).entries()].map(([c, xs], gi) => `<div class="nav-label" style="padding-left:0">${esc(nomeCult(c))} · ${esc(unCult(c))}/ha</div>` + hbars(xs.map(t => ({ label: t.nome, value: t.prod, color: SERIES[gi % 8], txt: nf(t.prod, 1), extra: [["Custo/ha", brl0(t.custoHa)]] })), v => nf(v, 1))).join("") || `<div class="empty"><b>Sem colheitas na safra.</b></div>`, { sub: "Barras na escala de cada cultura" })}
  ${panel("Composição do custo de produção", hbars([...comp.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ label: nomeCat(c), value: v, color: "var(--s1)", txt: brl0(v) + " · " + pct(v / compTot), extra: [["Por hectare", brl0(v / (e.areaTot || 1))]] }))), { sub: "Custo total da safra " + brl0(compTot) })}
  </div>
  ${(() => { const hz = histo.filter(h => h.p.culturas.some(c => c.colhido > 0)); if (!cultIds.length || hz.length < 2) return ""; const prodOf = (h, c) => { const x = h.p.culturas.find(y => y.culturaId === c); return x && x.colhido > 0 ? x.prod : NaN; };
    return panel("Evolução da produtividade entre safras", barChart({ labels: hz.map(h => h.s.nome), series: cultIds.slice(0, 4).map((c, i) => { const base = hz.map(h => prodOf(h, c)).find(isFinite); return { name: nomeCult(c), values: hz.map(h => { const v = prodOf(h, c); return isFinite(v) && base ? v / base * 100 : 0; }), color: SERIES[i] }; }), fmt: v => nf(v, 1) }) + table([{ h: "Cultura", f: c => `<b>${esc(nomeCult(c))}</b>` }].concat(hz.map(h => ({ h: h.s.nome, n: 1, f: c => { const v = prodOf(h, c); return isFinite(v) ? nf(v, 1) + " " + esc(unCult(c)) + "/ha" : "—"; } }))), cultIds), { sub: "Índice: primeira safra com colheita = 100. Tabela com os valores absolutos." }); })()}`;
});

/* ---------- Relatórios de estoque ---------- */
route("rel-estoque", "Relatórios de estoque", () => {
  const rows = estoqueInsumos(P.from, P.to); const e = E(); const h = today(); let out = "";
  const stPill = s => ({ ok: pill("Adequado", "good"), repor: pill("Repor", "bad"), zerado: pill("Zerado", "warn"), parado: pill("Sem giro", "plain") }[s]);
  if (RS.estTab === "posicao") {
    const tot = k => sum(rows, r => k(r));
    out = `<div class="kpis">${kpi("Estoque inicial", brl0(tot(r => r.ini.valor)), fmtD(addDays(P.from, -1)))}${kpi("Compras", brl0(tot(r => r.compras.v)), "No período")}${kpi("Consumo", brl0(tot(r => r.consumo.v)), "Aplicações")}${kpi("Perdas", brl0(tot(r => r.perdas.v)), pct(ratio(tot(r => r.perdas.v), tot(r => r.perdas.v + r.consumo.v))) + " das saídas")}${kpi("Estoque final", brl0(tot(r => r.fim.valor)), fmtD(P.to), "hero")}${kpi("Giro do estoque", nf(ratio(tot(r => r.consumo.v), (tot(r => r.ini.valor) + tot(r => r.fim.valor)) / 2), 2) + "x", "Consumo ÷ estoque médio")}</div>` +
      panel("Posição e indicadores por insumo", table([
        { h: "Insumo", f: r => `<b>${esc(r.i.nome)}</b><div class="note">${esc(r.i.grupo)}</div>`, cls: "wrap" }, { h: "Un.", f: r => esc(r.i.unidade) },
        { h: "Saldo inicial", n: 1, f: r => nf(r.ini.qtd, 2) }, { h: "Entradas", n: 1, f: r => nf(r.compras.q + r.ajPos.q + r.si.q, 2) }, { h: "Consumo", n: 1, f: r => nf(r.consumo.q, 2) }, { h: "Perdas", n: 1, f: r => nf(r.perdas.q, 2) },
        { h: "Saldo final", n: 1, f: r => `<b>${nf(r.fim.qtd, 2)}</b>` }, { h: "Custo médio", n: 1, f: r => brl(r.cu) }, { h: "Valor em estoque", n: 1, f: r => brl(r.fim.valor), foot: () => brl(tot(r => r.fim.valor)) },
        { h: "Mínimo", n: 1, f: r => r.min ? nf(r.min, 2) : "—" }, { h: "Consumo/dia", n: 1, f: r => nf(r.consDia, 2) }, { h: "Cobertura", n: 1, f: r => isFinite(r.cobertura) ? nf(r.cobertura, 0) + " dias" : "—" },
        { h: "Giro", n: 1, f: r => isFinite(r.giro) ? nf(r.giro, 2) + "x" : "—" }, { h: "% perdas", n: 1, f: r => isFinite(r.pctPerda) ? pct(r.pctPerda) : "—" },
        { h: "Último preço", n: 1, f: r => isFinite(r.ultPreco) ? brl(r.ultPreco) + `<div class="note">${fmtD(r.ultData)}</div>` : "—" }, { h: "Situação", f: r => stPill(r.status) }
      ], rows.filter(r => r.ini.qtd || r.fim.qtd || r.compras.q || r.consumo.q || r.min), { id: "estpos", foot: {} }), { sub: periodTxt() + " · custo médio ponderado móvel", flush: true, tools: csvBtn("estpos", "posicao-estoque-insumos") });
  } else if (RS.estTab === "kardex") {
    const iid = RS.kardexIns && get("insumos", RS.kardexIns) ? RS.kardexIns : (all("insumos")[0] || {}).id; const i = get("insumos", iid);
    const ms = e.movs.filter(m => m.insumoId === iid && m.data >= P.from && m.data <= P.to); const ini = e.stockAt(addDays(P.from, -1), iid);
    const rowsK = [{ _ini: true }].concat(ms);
    out = panel("Ficha de estoque (kardex)", `<div class="panel-b toolbar"><select class="inp sm" data-act="rs-sel" data-id="kardexIns" aria-label="Insumo">${opt(optInsumos(), iid)}</select></div>` + (i ? table([
      { h: "Data", f: m => m._ini ? fmtD(addDays(P.from, -1)) : fmtD(m.data) }, { h: "Histórico", f: m => m._ini ? "<b>Saldo anterior</b>" : esc(SUBTIPOS[m.subtipo].nome) + (m.subtipo === "compra" ? ` · ${esc(m.fornecedor || "")} ${m.documento ? "NF " + esc(m.documento) : ""}` : m.subtipo === "aplicacao" ? ` · ${m.destino === "talhao" ? esc(nomeTal(m.talhaoId)) : m.destino === "adm" ? "Sede" : "Rateio"}` : "") + (m.lote ? ` · lote ${esc(m.lote)}` : ""), cls: "wrap" },
      { h: "Entrada (qtd)", n: 1, f: m => !m._ini && SUBTIPOS[m.subtipo].tipo === "entrada" ? nf(num(m.qtd), 2) : "" }, { h: "Saída (qtd)", n: 1, f: m => !m._ini && SUBTIPOS[m.subtipo].tipo === "saida" ? nf(num(m.qtd), 2) : "" },
      { h: "Custo unit.", n: 1, f: m => m._ini ? "" : brl(e.mv.get(m.id).cu) }, { h: "Entrada (R$)", n: 1, f: m => !m._ini && SUBTIPOS[m.subtipo].tipo === "entrada" ? brl(e.mv.get(m.id).valor) : "" }, { h: "Saída (R$)", n: 1, f: m => !m._ini && SUBTIPOS[m.subtipo].tipo === "saida" ? brl(e.mv.get(m.id).valor) : "" },
      { h: "Saldo (qtd)", n: 1, f: m => `<b>${nf(m._ini ? ini.qtd : e.mv.get(m.id).saldoQtd, 2)}</b>` }, { h: "Saldo (R$)", n: 1, f: m => brl(m._ini ? ini.valor : e.mv.get(m.id).saldoValor) }, { h: "Custo médio", n: 1, f: m => { const x = m._ini ? ini : { qtd: e.mv.get(m.id).saldoQtd, valor: e.mv.get(m.id).saldoValor }; return x.qtd > 1e-9 ? brl(x.valor / x.qtd) : "—"; } }
    ], rowsK, { id: "kardex" }) : `<div class="empty"><b>Cadastre insumos para ver o kardex.</b></div>`), { sub: i ? `${i.nome} (${i.unidade}) · ${periodTxt()}` : "", flush: true, tools: csvBtn("kardex", "kardex") });
  } else if (RS.estTab === "talhao") {
    const aps = e.costs.filter(x => x.origem === "insumo" && x.data >= P.from && x.data <= P.to);
    const tal = [...groupBy(aps, x => x.talhaoId).entries()].map(([t, xs]) => { const tt = get("talhoes", t); const area = tt ? num(tt.area) : 0; const porG = new Map(); xs.forEach(x => { const g = (get("insumos", x.insumoId) || {}).grupo || "Outros"; porG.set(g, (porG.get(g) || 0) + x.v); }); return { t, tt, area, v: sum(xs, x => x.v), porG }; }).sort((a, b) => b.v - a.v);
    const grupos = [...new Set(tal.flatMap(r => [...r.porG.keys()]))];
    const doses = []; e.movs.filter(m => m.subtipo === "aplicacao" && m.destino === "talhao" && m.data >= P.from && m.data <= P.to).forEach(m => { const k = m.talhaoId + "|" + m.insumoId; let d = doses.find(x => x.k === k); if (!d) { d = { k, t: m.talhaoId, i: m.insumoId, q: 0, v: 0, n: 0 }; doses.push(d); } d.q += num(m.qtd); d.v += e.mv.get(m.id).valor; d.n++; });
    out = panel("Consumo de insumos por talhão", table([{ h: "Talhão", f: r => `<b>${esc(r.tt ? r.tt.nome : "Sem talhão")}</b><div class="note">${esc(r.tt ? nomeCult(r.tt.culturaId) : "")}</div>` }, { h: "Área", n: 1, f: r => nf(r.area, 1) + " ha" }]
      .concat(grupos.map(g => ({ h: g, n: 1, f: r => brl0(r.porG.get(g) || 0) }))).concat([{ h: "Total", n: 1, f: r => `<b>${brl0(r.v)}</b>` }, { h: "R$/ha", n: 1, f: r => brl0(ratio(r.v, r.area)) }]), tal, { id: "constal" }), { sub: "Inclui aplicações diretas e rateio de consumo geral por área · " + periodTxt(), flush: true, tools: csvBtn("constal", "consumo-por-talhao") })
      + panel("Doses aplicadas por talhão", table([{ h: "Talhão", f: d => esc(nomeTal(d.t)) }, { h: "Insumo", f: d => `<b>${esc((get("insumos", d.i) || {}).nome)}</b>` }, { h: "Aplicações", n: 1, f: d => String(d.n) }, { h: "Quantidade", n: 1, f: d => nf(d.q, 2) + " " + esc((get("insumos", d.i) || {}).unidade) }, { h: "Dose por ha", n: 1, f: d => { const t = get("talhoes", d.t); return t && num(t.area) ? `<b>${nf(d.q / num(t.area), 2)}</b> ${esc((get("insumos", d.i) || {}).unidade)}/ha` : "—"; } }, { h: "Custo", n: 1, f: d => brl0(d.v) }, { h: "Custo/ha", n: 1, f: d => { const t = get("talhoes", d.t); return t ? brl0(d.v / num(t.area)) : "—"; } }], doses.sort((a, b) => nomeTal(a.t).localeCompare(nomeTal(b.t), "pt-BR", { numeric: true })), { id: "doses" }), { flush: true, tools: csvBtn("doses", "doses-por-talhao") });
  } else if (RS.estTab === "abc") {
    const abc = rows.filter(r => r.consumo.v > 0).sort((a, b) => b.consumo.v - a.consumo.v);
    const cnt = c => abc.filter(r => r.abc === c);
    out = `<div class="kpis">${["A", "B", "C"].map(c => kpi("Classe " + c, cnt(c).length + " itens", pct(sum(cnt(c), r => r.abcShare)) + " do valor consumido")).join("")}</div>` + panel("Curva ABC do consumo", table([
      { h: "Classe", f: r => pill(r.abc, r.abc === "A" ? "bad" : r.abc === "B" ? "warn" : "plain") }, { h: "Insumo", f: r => `<b>${esc(r.i.nome)}</b>` }, { h: "Grupo", f: r => esc(r.i.grupo) },
      { h: "Valor consumido", n: 1, f: r => brl(r.consumo.v) }, { h: "Participação", n: 1, f: r => pct(r.abcShare) }, { h: "Acumulado", n: 1, f: r => pct(r.abcAcc) }
    ], abc, { id: "abc", empty: "Sem consumo no período." }), { sub: "A: até 80% do valor · B: até 95% · C: restante. Concentre negociação e controle nos itens A.", flush: true, tools: csvBtn("abc", "curva-abc-insumos") });
  } else if (RS.estTab === "validade") {
    const lim = addDays(h, 120);
    const lotes = e.movs.filter(m => m.validade && SUBTIPOS[m.subtipo].tipo === "entrada").map(m => ({ m, saldo: e.stockAt(h, m.insumoId).qtd })).filter(x => x.saldo > 1e-9 && x.m.validade <= lim).sort((a, b) => a.m.validade < b.m.validade ? -1 : 1);
    out = panel("Validades próximas (120 dias)", table([
      { h: "Validade", f: x => fmtD(x.m.validade) }, { h: "Situação", f: x => x.m.validade < h ? pill("Vencido", "bad") : daysBetween(h, x.m.validade) <= 30 ? pill(daysBetween(h, x.m.validade) + " dias", "bad") : pill(daysBetween(h, x.m.validade) + " dias", "warn") },
      { h: "Insumo", f: x => `<b>${esc((get("insumos", x.m.insumoId) || {}).nome)}</b>` }, { h: "Lote", f: x => esc(x.m.lote || "—") }, { h: "Entrada", f: x => fmtD(x.m.data) }, { h: "Qtd. do lote", n: 1, f: x => nf(num(x.m.qtd), 2) }, { h: "Saldo atual do insumo", n: 1, f: x => nf(x.saldo, 2) + " " + esc((get("insumos", x.m.insumoId) || {}).unidade) }
    ], lotes, { id: "validade", empty: "Nenhum lote com validade nos próximos 120 dias." }), { sub: "Lotes de insumos com saldo em estoque. Use primeiro os que vencem antes.", flush: true, tools: csvBtn("validade", "validades") });
  } else {
    const cps = e.movs.filter(m => m.subtipo === "compra" && m.data >= P.from && m.data <= P.to);
    const forn = [...groupBy(cps, m => m.fornecedor || "Não informado").entries()].map(([f, xs]) => ({ f, n: xs.length, v: sum(xs, m => e.mv.get(m.id).valor) })).sort((a, b) => b.v - a.v);
    const preco = rows.filter(r => r.compras.q > 0).map(r => { const cs = cps.filter(m => m.insumoId === r.i.id).sort((a, b) => a.data < b.data ? -1 : 1); return { r, first: num(cs[0].valorUnit), last: num(cs[cs.length - 1].valorUnit), min: Math.min(...cs.map(m => num(m.valorUnit))), max: Math.max(...cs.map(m => num(m.valorUnit))) }; });
    out = `<div class="grid g2">${panel("Compras por fornecedor", table([{ h: "Fornecedor", f: x => `<b>${esc(x.f)}</b>` }, { h: "Compras", n: 1, f: x => String(x.n) }, { h: "Valor", n: 1, f: x => brl0(x.v) }, { h: "Participação", n: 1, f: x => pct(x.v / (sum(forn, y => y.v) || 1)) }], forn, { id: "forn", empty: "Sem compras no período." }), { flush: true, tools: csvBtn("forn", "compras-por-fornecedor") })}
    ${panel("Evolução de preços de compra", table([{ h: "Insumo", f: x => `<b>${esc(x.r.i.nome)}</b>` }, { h: "Preço médio", n: 1, f: x => brl(x.r.precoMedio) }, { h: "Mínimo", n: 1, f: x => brl(x.min) }, { h: "Máximo", n: 1, f: x => brl(x.max) }, { h: "Variação 1ª→última", n: 1, f: x => `<span class="${x.last > x.first ? "neg" : ""}">${pct((x.last - x.first) / x.first)}</span>` }], preco, { id: "precos", empty: "Sem compras no período." }), { flush: true, tools: csvBtn("precos", "precos-insumos") })}</div>`;
  }
  return tabs("estTab", [["posicao", "Posição e giro"], ["kardex", "Kardex"], ["talhao", "Consumo por talhão"], ["abc", "Curva ABC"], ["validade", "Validades"], ["compras", "Compras e preços"]]) + out;
}, { period: true });

/* ---------- Vencimentos e endividamento ---------- */
route("aging", "Vencimentos e endividamento", () => {
  const e = E(); const h = today();
  const faixas = [["Vencido há mais de 90 dias", -1e9, -91], ["Vencido 31 a 90 dias", -90, -31], ["Vencido até 30 dias", -30, -1], ["Vence em até 30 dias", 0, 30], ["31 a 90 dias", 31, 90], ["91 a 180 dias", 91, 180], ["Mais de 180 dias", 181, 1e9]];
  const abertos = e.lancs.filter(l => !l.pagamento && !["captacao", "aporte"].includes(e.grupoOf(l.categoriaId)));
  const bucket = (dir) => faixas.map(([n, a, b]) => { const xs = abertos.filter(l => Math.sign(signedVal(l)) === dir).filter(l => { const d = daysBetween(h, l.vencimento || l.competencia); return d >= a && d <= b; }); return { n, q: xs.length, v: sum(xs, l => num(l.valor)) }; });
  const rec = bucket(1), pag = bucket(-1);
  const anos = {}; e.lancs.filter(l => !l.pagamento && ["amortizacao", "desp_fin"].includes(e.grupoOf(l.categoriaId)) && l.contratoId).forEach(l => { const y = (l.vencimento || l.competencia).slice(0, 4); anos[y] = anos[y] || { p: 0, j: 0 }; if (e.grupoOf(l.categoriaId) === "amortizacao") anos[y].p += num(l.valor); else anos[y].j += num(l.valor); });
  const ys = Object.keys(anos).sort();
  const top = abertos.filter(l => signedVal(l) < 0).sort((a, b) => (a.vencimento || "") < (b.vencimento || "") ? -1 : 1).slice(0, 15);
  return `<div class="grid g2">
    ${panel("Contas a receber por vencimento", table([{ h: "Faixa", f: r => esc(r.n) }, { h: "Títulos", n: 1, f: r => String(r.q) }, { h: "Valor", n: 1, f: r => `<span class="${r.n.startsWith("Vencido") && r.v > 0 ? "neg" : ""}">${brl0(r.v)}</span>`, foot: () => brl0(sum(rec, r => r.v)) }], rec, { id: "agrec", foot: {} }), { flush: true, tools: csvBtn("agrec", "aging-receber") })}
    ${panel("Contas a pagar por vencimento", table([{ h: "Faixa", f: r => esc(r.n) }, { h: "Títulos", n: 1, f: r => String(r.q) }, { h: "Valor", n: 1, f: r => `<span class="${r.n.startsWith("Vencido") && r.v > 0 ? "neg" : ""}">${brl0(r.v)}</span>`, foot: () => brl0(sum(pag, r => r.v)) }], pag, { id: "agpag", foot: {} }), { flush: true, tools: csvBtn("agpag", "aging-pagar") })}
  </div>
  ${panel("Cronograma da dívida", ys.length ? barChart({ labels: ys, series: [{ name: "Principal", values: ys.map(y => anos[y].p), color: "var(--s1)" }, { name: "Juros", values: ys.map(y => anos[y].j), color: "var(--s2)" }] }) + table([{ h: "Ano", f: y => `<b>${y}</b>` }, { h: "Principal", n: 1, f: y => brl0(anos[y].p) }, { h: "Juros", n: 1, f: y => brl0(anos[y].j) }, { h: "Serviço da dívida", n: 1, f: y => `<b>${brl0(anos[y].p + anos[y].j)}</b>` }], ys, { id: "divida" }) : `<div class="empty"><b>Nenhuma parcela de financiamento em aberto.</b></div>`, { sub: "Parcelas em aberto dos contratos cadastrados", tools: csvBtn("divida", "cronograma-divida") })}
  ${panel("Próximos pagamentos", table([{ h: "Vencimento", f: l => fmtD(l.vencimento) }, { h: "Descrição", f: l => `<b>${esc(l.descricao)}</b>`, cls: "wrap" }, { h: "Favorecido", f: l => esc(l.contraparte || "—") }, { h: "Valor", n: 1, f: l => brl(num(l.valor)) }, { h: "", f: l => statusLanc(l) === "vencido" ? pill("Vencido", "bad") : pill(daysBetween(h, l.vencimento) + " dias", "warn") }], top, { id: "prox" }), { flush: true })}`;
});

/* ---------- Orçamento ---------- */
function orcDoc(sid) { return get("orcamentos", sid) || { id: sid, safraId: sid, premissas: [], linhas: [] }; }
function safraMeses(s) { return monthsInRange(s.inicio, s.fim); }
function planoSafra(sid) {
  const s = get("safras", sid); const o = orcDoc(sid); const ms = safraMeses(s); const n = ms.length; const C = cfg();
  const porCat = new Map(); const add = (c, i, v) => { if (!porCat.has(c)) porCat.set(c, new Array(n).fill(0)); porCat.get(c)[i] += v; };
  const prod = [];
  (o.premissas || []).forEach(p => {
    const qtd = num(p.area) * num(p.produtividade); const rec = qtd * num(p.preco) * (p.pctVenda === "" || p.pctVenda == null ? 1 : num(p.pctVenda) / 100);
    const ini = Math.max(0, Math.min(n - 1, Math.round(num(p.mesVenda)))); const k = Math.max(1, Math.min(n - ini, Math.round(num(p.mesesVenda) || 1)));
    for (let i = 0; i < k; i++) { add("c_venda", ini + i, rec / k); add("c_funrural", ini + i, rec / k * num(C.funruralPct) / 100); }
    prod.push({ ...p, qtd, rec });
  });
  (o.linhas || []).forEach(l => (l.valores || []).forEach((v, i) => { if (i < n) add(l.categoriaId, i, num(v)); }));
  const grupoMes = {}; Object.keys(GRUPOS).forEach(g => grupoMes[g] = new Array(n).fill(0));
  porCat.forEach((vals, c) => { const g = (get("categorias", c) || {}).grupo; if (grupoMes[g]) vals.forEach((v, i) => grupoMes[g][i] += v); });
  return { s, o, ms, porCat, grupoMes, prod };
}
function drePlano(pl, idx) {
  const G = g => idx == null ? sum(pl.grupoMes[g]) : pl.grupoMes[g][idx];
  const [a, b] = idx == null ? [pl.s.inicio, pl.s.fim] : clampRange(pl.ms[idx], pl.s.inicio, pl.s.fim);
  const rb = G("receita"), ded = G("deducao"), rl = rb - ded, cmv = G("custo") + G("compra_insumo"), lb = rl - cmv, com = G("comercial"), adm = G("administrativa"), ebitda = lb - com - adm, dep = E().depPeriodo(a, b).total, ebit = ebitda - dep, rf = G("rec_fin"), df = G("desp_fin"), lair = ebit + rf - df, ir = G("ir"), ll = lair - ir;
  const lines = {}; DRE_GRUPOS.forEach(g => { lines[g] = { total: G(g), porCat: new Map() }; pl.porCat.forEach((vals, c) => { if ((get("categorias", c) || {}).grupo === g) lines[g].porCat.set(c, idx == null ? sum(vals) : vals[idx]); }); });
  const cmvCult = new Map(); if (cmv) cmvCult.set("_plan", cmv);
  return { rb, ded, rl, cmv, custoTotal: cmv, perdas: 0, lb, com, adm, admIns: 0, ebitda, dep, ebit, rf, df, lair, ir, ll, lines, cmvCult };
}
function orcSafraId() { return RS.orcSafra && get("safras", RS.orcSafra) ? RS.orcSafra : currentSafraId(); }
let ORC_EDIT = null;
route("orcamento", "Orçamento da safra", () => {
  const sid = orcSafraId(); if (!sid) return `<div class="empty"><b>Cadastre uma safra para montar o orçamento.</b></div>`;
  const s = get("safras", sid); const ms = safraMeses(s);
  if (!ORC_EDIT || ORC_EDIT.id !== sid || !VIEW.dirty) ORC_EDIT = JSON.parse(JSON.stringify(orcDoc(sid)));
  const o = ORC_EDIT; const pl = planoSafra(sid); const d = drePlano(pl);
  const premRows = (o.premissas || []).map((p, i) => `<tr><td><select class="inp sm" data-orc="p:${i}:culturaId">${opt(optCulturas(), p.culturaId, "Cultura…")}</select></td>
    <td class="n"><input class="inp sm inline-num" data-orc="p:${i}:area" value="${esc(String(p.area ?? "").replace(".", ","))}" inputmode="decimal" aria-label="Área"></td>
    <td class="n"><input class="inp sm inline-num" data-orc="p:${i}:produtividade" value="${esc(String(p.produtividade ?? "").replace(".", ","))}" inputmode="decimal" aria-label="Produtividade"></td>
    <td class="n"><input class="inp sm inline-num" data-orc="p:${i}:preco" value="${esc(String(p.preco ?? "").replace(".", ","))}" inputmode="decimal" aria-label="Preço"></td>
    <td class="n"><input class="inp sm inline-num" data-orc="p:${i}:pctVenda" value="${esc(String(p.pctVenda ?? 100).replace(".", ","))}" inputmode="decimal" aria-label="% vendido"></td>
    <td><select class="inp sm" data-orc="p:${i}:mesVenda">${opt(ms.map((k, j) => [j, fmtM(k)]), p.mesVenda ?? 0)}</select></td>
    <td class="n"><input class="inp sm inline-num" style="width:60px" data-orc="p:${i}:mesesVenda" value="${esc(p.mesesVenda ?? 1)}" inputmode="numeric" aria-label="Meses de venda"></td>
    <td class="n">${nf(num(p.area) * num(p.produtividade), 0)} ${esc(unCult(p.culturaId))}</td><td class="n"><b>${brl0(num(p.area) * num(p.produtividade) * num(p.preco) * num(p.pctVenda ?? 100) / 100)}</b></td>
    <td class="acts"><button class="btn sm ghost" data-orc-del="p:${i}" aria-label="Remover">${ico("trash")}</button></td></tr>`).join("");
  const linhas = (o.linhas || []);
  const linRows = linhas.map((l, i) => `<tr><td style="min-width:220px"><select class="inp sm" data-orc="l:${i}:categoriaId" style="width:100%">${opt(optCategorias(c => !c.sistema && c.grupo !== "receita"), l.categoriaId, "Conta…")}</select></td>
    ${ms.map((k, j) => `<td class="n"><input class="inp sm inline-num" style="width:84px" data-orc="l:${i}:v${j}" value="${l.valores && l.valores[j] ? esc(String(l.valores[j]).replace(".", ",")) : ""}" inputmode="decimal" aria-label="${fmtM(k)}"></td>`).join("")}
    <td class="n"><b>${brl0(sum(l.valores || []))}</b></td><td class="acts"><button class="btn sm ghost" data-orc-fill="${i}" title="Distribuir o total igualmente">÷</button><button class="btn sm ghost" data-orc-del="l:${i}" aria-label="Remover">${ico("trash")}</button></td></tr>`).join("");
  return `<div class="toolbar"><label class="note" for="osafra">Safra</label><select class="inp sm" id="osafra" data-act="rs-sel" data-id="orcSafra">${opt(optSafras(), sid)}</select><span class="note">${fmtD(s.inicio)} a ${fmtD(s.fim)}</span><span class="grow"></span>${VIEW.dirty ? `<span class="pill warn">Alterações não salvas</span><button class="btn sm" data-orc-cancel>Descartar</button>` : ""}<button class="btn sm" data-orc-copy>Copiar do realizado da safra anterior</button><button class="btn pri sm" data-orc-save ${VIEW.dirty ? "" : "disabled"}>Salvar orçamento</button></div>
  <div class="kpis">${kpi("Receita bruta orçada", brl0(d.rb), "")}${kpi("Custos de produção orçados", brl0(d.cmv), brl0(ratio(d.cmv, sum(o.premissas || [], p => num(p.area)))) + "/ha")}${kpi("EBITDA orçado", brl0(d.ebitda), "Margem " + pct(ratio(d.ebitda, d.rl)))}${kpi("Lucro líquido orçado", brl0(d.ll), "Margem " + pct(ratio(d.ll, d.rl)), "hero")}</div>
  ${panel("Premissas de produção e venda", `<div class="tw"><table class="t compact"><thead><tr><th>Cultura</th><th class="n">Área (ha)</th><th class="n">Produtiv. (un/ha)</th><th class="n">Preço (R$/un)</th><th class="n">% vendido</th><th>1º mês de venda</th><th class="n">Nº meses</th><th class="n">Produção</th><th class="n">Receita</th><th></th></tr></thead><tbody>${premRows || `<tr><td colspan="10" class="empty">Adicione a área, produtividade e preço esperados de cada cultura.</td></tr>`}</tbody></table></div>`, { sub: `Receita bruta e Funrural (${nf(num(cfg().funruralPct), 2)}%) são calculados a partir das premissas`, flush: true, tools: `<div class="toolbar"><button class="btn sm" data-orc-add="p">${ico("plus")} Cultura</button><button class="btn sm" data-orc-area>Preencher com áreas dos talhões</button></div>` })}
  ${panel("Orçamento de custos, despesas, investimentos e financiamentos", `<div class="tw"><table class="t compact"><thead><tr><th>Conta</th>${ms.map(k => `<th class="n">${fmtM(k)}</th>`).join("")}<th class="n">Total</th><th></th></tr></thead><tbody>${linRows || `<tr><td colspan="${ms.length + 3}" class="empty">Adicione as contas que serão orçadas mês a mês.</td></tr>`}</tbody></table></div>`, { sub: "Valores em R$ por mês de competência; usados também como previsão de caixa no orçado × realizado", flush: true, tools: `<button class="btn sm" data-orc-add="l">${ico("plus")} Conta</button>` })}
  ${panel("DRE projetada da safra", dreTable([d], ["Orçado"], { id: "dreplan", av: true }), { flush: true, tools: csvBtn("dreplan", "dre-projetada") })}`;
}, {
  after: () => {
    const sid = orcSafraId(); if (!sid || !ORC_EDIT) return; const o = ORC_EDIT; const s = get("safras", sid); const ms = safraMeses(s);
    const dirty = () => { if (!VIEW.dirty) { VIEW.dirty = true; } };
    const rerender = () => { const y = scrollY; VIEW.dirty = true; $("#view").innerHTML = ROUTES.orcamento.render(); bindView(); ROUTES.orcamento.after(); scrollTo(0, y); };
    $$("[data-orc]").forEach(el => el.addEventListener("change", () => {
      const [t, i, f] = el.dataset.orc.split(":"); const arr = t === "p" ? o.premissas : o.linhas; const row = arr[+i];
      if (t === "l" && f.startsWith("v")) { row.valores = row.valores || new Array(ms.length).fill(0); row.valores[+f.slice(1)] = num(el.value); }
      else row[f] = ["culturaId", "categoriaId"].includes(f) ? el.value : num(el.value);
      dirty(); rerender();
    }));
    $$("[data-orc-del]").forEach(b => b.onclick = () => { const [t, i] = b.dataset.orcDel.split(":"); (t === "p" ? o.premissas : o.linhas).splice(+i, 1); rerender(); });
    $$("[data-orc-fill]").forEach(b => b.onclick = () => { const l = o.linhas[+b.dataset.orcFill]; const t = sum(l.valores || []); if (!t) { toast("Digite o total em qualquer mês e clique em ÷ para distribuir."); return; } l.valores = new Array(ms.length).fill(t / ms.length); rerender(); });
    $$("[data-orc-add]").forEach(b => b.onclick = () => { if (b.dataset.orcAdd === "p") { o.premissas = o.premissas || []; o.premissas.push({ culturaId: "", area: 0, produtividade: 0, preco: 0, pctVenda: 100, mesVenda: 0, mesesVenda: 1 }); } else { o.linhas = o.linhas || []; o.linhas.push({ id: uid("ol"), categoriaId: "", valores: new Array(ms.length).fill(0) }); } rerender(); });
    const ar = $("[data-orc-area]"); if (ar) ar.onclick = () => { const e = E(); o.premissas = o.premissas || []; e.areaCult.forEach((a, c) => { let p = o.premissas.find(x => x.culturaId === c); if (!p) { const cu = get("culturas", c) || {}; p = { culturaId: c, produtividade: 0, preco: num(cu.precoRef), pctVenda: 100, mesVenda: 0, mesesVenda: 1 }; o.premissas.push(p); } p.area = a; }); rerender(); };
    const cp = $("[data-orc-copy]"); if (cp) cp.onclick = () => {
      const e = E(); const idx = e.safras.findIndex(x => x.id === sid); const prev = e.safras[idx - 1]; if (!prev) { toast("Não há safra anterior cadastrada.", true); return; }
      const pms = safraMeses(prev); const map = new Map();
      e.lancs.forEach(l => { const g = e.grupoOf(l.categoriaId); if (["receita", "compra_insumo"].includes(g) || !GRUPOS[g] || (get("categorias", l.categoriaId) || {}).sistema) return; if (l.competencia < prev.inicio || l.competencia > prev.fim) return; if (l.categoriaId === "c_funrural") return; const j = pms.indexOf(monthKey(l.competencia)); if (j < 0 || j >= ms.length) return; if (!map.has(l.categoriaId)) map.set(l.categoriaId, new Array(ms.length).fill(0)); map.get(l.categoriaId)[j] += num(l.valor); });
      e.costs.filter(x => x.origem === "insumo" && x.safraId === prev.id).forEach(x => { const j = Math.max(0, pms.indexOf(monthKey(x.data))); if (j >= ms.length) return; if (!map.has(x.catId)) map.set(x.catId, new Array(ms.length).fill(0)); map.get(x.catId)[j] += x.v; });
      o.linhas = [...map.entries()].map(([c, v]) => ({ id: uid("ol"), categoriaId: c, valores: v.map(x => Math.round(x * 100) / 100) }));
      const pr = producaoSafra(prev.id); o.premissas = pr.culturas.filter(c => c.culturaId).map(c => ({ culturaId: c.culturaId, area: c.area, produtividade: isFinite(c.prod) ? +c.prod.toFixed(2) : 0, preco: +c.preco.toFixed(2), pctVenda: 100, mesVenda: 0, mesesVenda: 1 }));
      toast("Base copiada da safra " + prev.nome + ". Ajuste e salve."); rerender();
    };
    const sv = $("[data-orc-save]"); if (sv) sv.onclick = async () => { if (!Store.canWrite) { toast("Acesso somente leitura.", true); return; } o.premissas = (o.premissas || []).filter(p => p.culturaId); o.linhas = (o.linhas || []).filter(l => l.categoriaId); const doc = { ...o, id: sid, safraId: sid }; VIEW.dirty = false; await Store.put("orcamentos", doc); toast("Orçamento salvo"); render(); };
    const cc = $("[data-orc-cancel]"); if (cc) cc.onclick = () => { VIEW.dirty = false; ORC_EDIT = null; render(); };
  }
});

/* ---------- Orçado × realizado ---------- */
route("comparativo", "Orçado × realizado", () => {
  const sid = RS.compSafra && get("safras", RS.compSafra) ? RS.compSafra : safraColhida(); if (!sid) return `<div class="empty"><b>Cadastre uma safra e seu orçamento.</b></div>`;
  const pl = planoSafra(sid); const s = pl.s; const h = today(); const ate = h < s.fim ? (h < s.inicio ? s.inicio : h) : s.fim;
  const temOrc = !!get("orcamentos", sid);
  const realD = dre(s.inicio, s.fim), planD = drePlano(pl);
  const varCell = (p, r, custo) => { const v = r - p; const fav = custo ? v <= 0 : v >= 0; return `<td class="n ${Math.abs(v) < .5 ? "" : fav ? "pos" : "neg"}">${Math.abs(v) < .5 ? "–" : brl0(v)}</td><td class="n muted">${Math.abs(p) > .5 ? pct(v / Math.abs(p)) : "–"}</td>`; };
  let out = "";
  if (RS.compTab === "dre") {
    const keys = [["(=) Receita bruta", "rb"], ["(−) Deduções", "ded", 1], ["(=) Receita líquida", "rl"], ["(−) Custos de produção / CMV", "custoTotal", 1], ["(=) Lucro bruto", "lb"], ["(−) Despesas comerciais", "com", 1], ["(−) Despesas administrativas", "adm", 1], ["(=) EBITDA", "ebitda"], ["(−) Depreciação", "dep", 1], ["(=) EBIT", "ebit"], ["(+) Receitas financeiras", "rf"], ["(−) Despesas financeiras", "df", 1], ["(=) Lucro antes do IR", "lair"], ["(−) IRPJ e CSLL", "ir", 1], ["(=) Lucro líquido", "ll"]];
    out = panel("DRE orçada × realizada", `<div class="tw" data-table="cmpdre"><table class="t compact"><thead><tr><th>Linha</th><th class="n">Orçado</th><th class="n">Realizado</th><th class="n">Variação</th><th class="n">%</th><th class="n">AV orçado</th><th class="n">AV realizado</th></tr></thead><tbody>${keys.map(([l, k, c]) => { const sg = c ? -1 : 1; const p = planD[k] * sg, r = realD[k] * sg; return `<tr class="${l.startsWith("(=)") ? "big" : ""}"><td>${esc(l)}</td>${cell(p)}${cell(r)}${varCell(p, r, false)}${cellPct(ratio(p, planD.rl))}${cellPct(ratio(r, realD.rl))}</tr>`; }).join("")}</tbody></table></div>
    <div class="panel-b note">Realizado por competência na safra (${fmtD(s.inicio)} a ${fmtD(s.fim)}). No realizado, custos de produção entram na DRE como CMV quando o produto é vendido; o orçado considera a produção vendida conforme as premissas. Para acompanhar o gasto da lavoura use a aba Custos de produção.</div>`, { flush: true, tools: csvBtn("cmpdre", "dre-orcado-realizado") });
  } else if (RS.compTab === "custos") {
    const e = E(); const real = new Map(); e.costs.filter(x => x.safraId === sid).forEach(x => real.set(x.catId, (real.get(x.catId) || 0) + x.v));
    const plan = new Map(); pl.porCat.forEach((v, c) => { if ((get("categorias", c) || {}).grupo === "custo") plan.set(c, sum(v)); });
    const cats = [...new Set([...real.keys(), ...plan.keys()])].sort((a, b) => (plan.get(b) || 0) - (plan.get(a) || 0));
    const area = sum(pl.prod, p => num(p.area)) || E().areaTot || 1; const tp = sum([...plan.values()]), tr = sum([...real.values()]);
    const elapsed = Math.min(1, Math.max(0, (daysBetween(s.inicio, ate) + 1) / (daysBetween(s.inicio, s.fim) + 1)));
    out = `<div class="kpis">${kpi("Custo orçado da safra", brl0(tp), brl0(tp / area) + "/ha")}${kpi("Custo incorrido até agora", brl0(tr), brl0(tr / area) + "/ha")}${kpi("Execução do orçamento", pct(ratio(tr, tp)), "Tempo decorrido da safra " + pct(elapsed))}${kpi("Saldo a executar", brl0(tp - tr), tp - tr < 0 ? pill("Estourado", "bad") : pill("Dentro do orçado", "good"))}</div>` +
      panel("Custos de produção por conta", `<div class="tw" data-table="cmpcust"><table class="t compact"><thead><tr><th>Conta</th><th class="n">Orçado</th><th class="n">Orçado/ha</th><th class="n">Incorrido</th><th class="n">Incorrido/ha</th><th class="n">Variação</th><th class="n">%</th><th class="n">Execução</th></tr></thead><tbody>${cats.map(c => { const p = plan.get(c) || 0, r = real.get(c) || 0; return `<tr><td>${esc(nomeCat(c))}</td>${cell(p)}${cell(p / area)}${cell(r)}${cell(r / area)}${varCell(p, r, true)}<td class="n">${p ? pct(r / p) : "–"}</td></tr>`; }).join("")}<tr class="big"><td>Total</td>${cell(tp)}${cell(tp / area)}${cell(tr)}${cell(tr / area)}${varCell(tp, tr, true)}<td class="n">${pct(ratio(tr, tp))}</td></tr></tbody></table></div>`, { sub: "Incorrido = insumos aplicados + custos lançados na safra (competência)", flush: true, tools: csvBtn("cmpcust", "custos-orcado-realizado") });
  } else if (RS.compTab === "caixa") {
    const real = fluxoMensal(s.inicio, s.fim, false); let accP = 0, accR = 0;
    const rows = pl.ms.map((k, i) => { const p = sum(Object.keys(GRUPOS), g => pl.grupoMes[g][i] * GRUPOS[g].dir); const rc = real[i]; const r = rc && rc.a <= h ? rc.liq : NaN; accP += p; if (isFinite(r)) accR += r; return { k, p, r, accP, accR: isFinite(r) ? accR : NaN, ent: sum(Object.keys(GRUPOS).filter(g => GRUPOS[g].dir > 0), g => pl.grupoMes[g][i]), sai: sum(Object.keys(GRUPOS).filter(g => GRUPOS[g].dir < 0), g => pl.grupoMes[g][i]), rent: rc ? sum(Object.keys(GRUPOS), g => Math.max(0, rc.g[g])) : 0, rsai: rc ? -sum(Object.keys(GRUPOS), g => Math.min(0, rc.g[g])) : 0 }; });
    out = panel("Fluxo de caixa orçado × realizado", barChart({ labels: rows.map(r => fmtM(r.k)), series: [{ name: "Geração orçada", values: rows.map(r => r.p), color: "var(--s1)" }, { name: "Geração realizada", values: rows.map(r => isFinite(r.r) ? r.r : 0), color: "var(--s2)" }] }) + table([
      { h: "Mês", f: r => fmtM(r.k) }, { h: "Entradas orçadas", n: 1, f: r => brl0(r.ent) }, { h: "Entradas realizadas", n: 1, f: r => isFinite(r.r) ? brl0(r.rent) : "—" }, { h: "Saídas orçadas", n: 1, f: r => brl0(-r.sai) }, { h: "Saídas realizadas", n: 1, f: r => isFinite(r.r) ? brl0(-r.rsai) : "—" },
      { h: "Geração orçada", n: 1, f: r => `<b>${brl0(r.p)}</b>` }, { h: "Geração realizada", n: 1, f: r => isFinite(r.r) ? `<b class="${signCls(r.r)}">${brl0(r.r)}</b>` : "—" }, { h: "Variação", n: 1, f: r => isFinite(r.r) ? `<span class="${r.r - r.p < 0 ? "neg" : "pos"}">${brl0(r.r - r.p)}</span>` : "—" },
      { h: "Acumulado orçado", n: 1, f: r => brl0(r.accP) }, { h: "Acumulado realizado", n: 1, f: r => isFinite(r.accR) ? brl0(r.accR) : "—" }
    ], rows, { id: "cmpcx" }), { sub: "Orçado por mês de competência (premissa de pagamento no mês); realizado por data de pagamento", tools: csvBtn("cmpcx", "caixa-orcado-realizado") });
  } else {
    const pr = producaoSafra(sid);
    const rows = pl.prod.map(p => { const r = pr.culturas.find(c => c.culturaId === p.culturaId) || {}; return { p, r, c: get("culturas", p.culturaId) || {} }; });
    out = panel("Produção orçada × realizada", table([
      { h: "Cultura", f: x => `<b>${esc(x.c.nome || "—")}</b>` }, { h: "Área orçada", n: 1, f: x => nf(num(x.p.area), 1) }, { h: "Área real", n: 1, f: x => nf(x.r.area || 0, 1) },
      { h: "Produtiv. orçada", n: 1, f: x => nf(num(x.p.produtividade), 1) }, { h: "Produtiv. real", n: 1, f: x => isFinite(x.r.prod) && x.r.colhido ? nf(x.r.prod, 1) : "—" }, { h: "Var. produtividade", n: 1, f: x => isFinite(x.r.prod) && x.r.colhido && num(x.p.produtividade) ? `<span class="${x.r.prod < num(x.p.produtividade) ? "neg" : "pos"}">${pct(x.r.prod / num(x.p.produtividade) - 1)}</span>` : "—" },
      { h: "Produção orçada", n: 1, f: x => nf(x.p.qtd, 0) + " " + esc(x.c.unidade || "") }, { h: "Produção real", n: 1, f: x => nf(x.r.colhido || 0, 0) },
      { h: "Preço orçado", n: 1, f: x => brl(num(x.p.preco)) }, { h: "Preço médio real", n: 1, f: x => x.r.vendido ? brl(x.r.receitaVendas / x.r.vendido) : "—" },
      { h: "Custo/ha orçado", n: 1, f: x => { const cc = sum([...pl.porCat.entries()].filter(([c]) => (get("categorias", c) || {}).grupo === "custo"), ([, v]) => sum(v)); const at = sum(pl.prod, y => num(y.area)) || 1; return brl0(cc / at); } }, { h: "Custo/ha real", n: 1, f: x => brl0(x.r.custoHa || 0) }
    ], rows, { id: "cmpprod", empty: "Cadastre as premissas de produção no orçamento." }), { sub: "Custo/ha orçado é a média da fazenda; o real é por cultura", flush: true, tools: csvBtn("cmpprod", "producao-orcado-realizado") });
  }
  return `<div class="toolbar"><label class="note" for="csafra">Safra</label><select class="inp sm" id="csafra" data-act="rs-sel" data-id="compSafra">${opt(optSafras(), sid)}</select>${temOrc ? "" : `<span class="pill warn">Safra sem orçamento salvo</span> <a href="#orcamento">Montar orçamento</a>`}</div>
  ${tabs("compTab", [["dre", "DRE"], ["custos", "Custos de produção"], ["caixa", "Fluxo de caixa"], ["producao", "Produção"]])}${out}`;
});
/* ================= PAINEL ================= */
route("painel", "Painel", () => {
  const e = E(); const h = today(); const I = indicadores(P.from, P.to); const d = I.d;
  const ms = monthsInRange(P.from, P.to < h ? P.to : h); const dm = ms.map(k => { const [a, b] = clampRange(k, P.from, P.to); return dre(a, b); });
  const proj = fluxoMensal(monthStart(h), monthEnd(addMonths(h, 5)), true);
  const sid = safraColhida(); const pr = sid ? producaoSafra(sid) : { culturas: [] };
  const prevS = e.safras[e.safras.findIndex(s => s.id === sid) - 1]; const prPrev = prevS ? producaoSafra(prevS.id) : { culturas: [] };
  // alertas
  const al = [];
  const venc = e.lancs.filter(l => statusLanc(l) === "vencido");
  const vencP = venc.filter(l => signedVal(l) < 0), vencR = venc.filter(l => signedVal(l) > 0);
  if (vencP.length) al.push(["bad", "Pagamentos vencidos", `${vencP.length} títulos somando ${brl0(sum(vencP, l => num(l.valor)))}`, "lancamentos"]);
  if (vencR.length) al.push(["warn", "Recebimentos atrasados", `${vencR.length} títulos somando ${brl0(sum(vencR, l => num(l.valor)))}`, "lancamentos"]);
  const sem = e.lancs.filter(l => !l.pagamento && l.vencimento >= h && l.vencimento <= addDays(h, 7) && signedVal(l) < 0);
  if (sem.length) al.push(["info", "Vencem nos próximos 7 dias", `${sem.length} pagamentos · ${brl0(sum(sem, l => num(l.valor)))}`, "lancamentos"]);
  const baixo = all("insumos").filter(i => num(i.estoqueMin) > 0 && e.stockAt(h, i.id).qtd < num(i.estoqueMin));
  if (baixo.length) al.push(["bad", "Insumos abaixo do estoque mínimo", baixo.slice(0, 4).map(i => i.nome).join(", ") + (baixo.length > 4 ? ` e mais ${baixo.length - 4}` : ""), "movimentos"]);
  const vali = e.movs.filter(m => m.validade && m.validade <= addDays(h, 60) && e.stockAt(h, m.insumoId).qtd > 0);
  if (vali.length) al.push(["warn", "Validades próximas", `${vali.length} lotes vencem em até 60 dias`, "rel-estoque"]);
  const neg = proj.find(c => c.fim < 0); if (neg) al.push(["bad", "Caixa projetado negativo", `Saldo de ${brl0(neg.fim)} em ${fmtM(neg.k)}. Antecipe recebimentos ou contrate capital de giro.`, "fluxo"]);
  if (sid && !get("orcamentos", sid)) al.push(["info", "Safra sem orçamento", `Monte o orçamento da safra ${nomeSafra(sid)} para comparar orçado × realizado.`, "orcamento"]);
  const bp = I.b; if (Math.abs(bp.diff) > 1) al.push(["bad", "Balanço não fecha", `Diferença de ${brl(bp.diff)}`, "balanco"]);
  const cultsChart = pr.culturas.filter(c => c.area > 0);
  return `<div class="kpis">
    ${kpi("Receita líquida", brl0(d.rl), `Receita bruta ${brl0(d.rb)}`)}
    ${kpi("EBITDA", brl0(d.ebitda), `Margem ${pct(I.margemEbitda)}`)}
    ${kpi("Lucro líquido", brl0(d.ll), `Margem líquida ${pct(I.margemLiquida)}`, "hero")}
    ${kpi("Caixa hoje", brl0(caixaEm(h)), `Geração operacional no período ${brl0(I.fco)}`)}
    ${I.divLiq < 0 ? kpi("Caixa líquido", brl0(-I.divLiq), `Caixa supera a dívida bruta de ${brl0(I.divida)}`) : kpi("Dívida líquida / EBITDA", isFinite(I.divLiqEbitda) ? nf(I.divLiqEbitda, 2) + "x" : "—", `Dívida bruta ${brl0(I.divida)}`)}
    ${kpi("Ciclo de caixa", isFinite(I.ccc) ? nf(I.ccc, 0) + " dias" : "—", `PMRE ${isFinite(I.pmre) ? nf(I.pmre, 0) : "—"} · PMR ${isFinite(I.pmr) ? nf(I.pmr, 0) : "—"} · PMP ${isFinite(I.pmp) ? nf(I.pmp, 0) : "—"}`)}
  </div>
  <div class="toolbar"><button class="btn sm" data-act="lanc-novo">${ico("plus")} Lançamento</button><button class="btn sm" data-act="venda-nova">${ico("plus")} Venda</button><button class="btn sm" data-act="colh-nova">${ico("plus")} Colheita</button><button class="btn sm" data-act="mov-entrada">${ico("plus")} Compra de insumo</button><button class="btn sm" data-act="mov-saida">${ico("plus")} Aplicação de insumo</button></div>
  <div class="grid g-3-2">
    ${panel("Resultado mensal", barChart({ labels: ms.map(fmtM), series: [{ name: "Receita líquida", values: dm.map(x => x.rl), color: "var(--s1)" }, { name: "Custos e despesas", values: dm.map(x => -(x.custoTotal + x.com + x.adm)), color: "var(--s2)" }, { name: "EBITDA", values: dm.map(x => x.ebitda), color: "var(--s3)", line: true }] }), { sub: "Competência · " + periodTxt() })}
    ${panel("Alertas", al.length ? `<div class="alerts">${al.map(([c, t, txt, r]) => `<div class="alert">${pill(c === "bad" ? "Crítico" : c === "warn" ? "Atenção" : "Aviso", c)}<div><b>${esc(t)}</b><div class="note">${esc(txt)} · <a href="#${r}">abrir</a></div></div></div>`).join("")}</div>` : `<div class="empty"><b>Nenhum alerta.</b>Pagamentos, estoques e caixa em ordem.</div>`, { flush: true })}
  </div>
  <div class="grid g2">
    ${panel("Caixa projetado · próximos 6 meses", barChart({ labels: proj.map(c => fmtM(c.k)), series: [{ name: "Entradas", values: proj.map(c => sum(Object.keys(GRUPOS), g => Math.max(0, c.g[g]))), color: "var(--s1)" }, { name: "Saídas", values: proj.map(c => sum(Object.keys(GRUPOS), g => Math.min(0, c.g[g]))), color: "var(--s2)" }, { name: "Saldo final", values: proj.map(c => c.fim), color: "var(--s7)", line: true }] }), { sub: "Títulos em aberto por vencimento" })}
    ${panel("Custo × receita por hectare" + (sid ? " · safra " + nomeSafra(sid) : ""), barChart({ labels: cultsChart.map(c => c.c.nome), series: [{ name: "Custo/ha", values: cultsChart.map(c => c.custoHa || 0), color: "var(--s2)" }, { name: "Receita/ha", values: cultsChart.map(c => ratio(c.receita, c.area) || 0), color: "var(--s1)" }, { name: "Margem/ha", values: cultsChart.map(c => c.margemHa || 0), color: "var(--s3)" }] }), { sub: "Receita pela produção colhida × preço médio (ou referência)" })}
  </div>
  <div class="grid g2">
    ${panel("Produtividade por cultura", table([{ h: "Cultura", f: c => `<b>${esc(c.c.nome)}</b>` }, { h: "Área", n: 1, f: c => nf(c.area, 1) + " ha" }, { h: prevS ? "Safra " + prevS.nome : "Anterior", n: 1, f: c => { const p = prPrev.culturas.find(x => x.culturaId === c.culturaId); return p && p.colhido ? nf(p.prod, 1) + " " + esc(c.c.unidade) + "/ha" : "—"; } }, { h: sid ? "Safra " + nomeSafra(sid) : "Atual", n: 1, f: c => c.colhido ? `<b>${nf(c.prod, 1)}</b> ${esc(c.c.unidade)}/ha` : pill("Em formação", "info") }, { h: "Custo/ha", n: 1, f: c => brl0(c.custoHa) }], pr.culturas.filter(c => c.area > 0)), { flush: true })}
    ${panel("Estrutura de capital", `<div class="hbar">${hbars([{ label: "Caixa", value: bp.caixa, color: "var(--s1)" }, { label: "Estoques e lavouras", value: bp.estIns + bp.estProd + bp.wip, color: "var(--s3)" }, { label: "Contas a receber", value: bp.ar, color: "var(--s4)" }, { label: "Imobilizado líquido", value: bp.anc, color: "var(--s7)" }, { label: "Dívida bancária", value: bp.emprest, color: "var(--s2)" }, { label: "Fornecedores e impostos", value: bp.apForn + bp.apFisc, color: "var(--s8)" }, { label: "Patrimônio líquido", value: bp.pl, color: "var(--s6)" }])}</div><div class="stat-row" style="margin-top:12px"><span>Liquidez corrente <b>${nf(I.liqCorrente, 2)}</b></span><span>Endividamento <b>${pct(I.endivGeral)}</b></span><span>ROE no período <b>${pct(I.roe)}</b></span></div>`, { sub: "Posição em " + fmtD(P.to) })}
  </div>`;
}, { period: true });

/* ================= FAZENDA DE EXEMPLO ================= */
function buildDemo() {
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const vary = (v, p = 0.06) => v * (1 + (rnd() * 2 - 1) * p);
  const r2 = v => Math.round(v * 100) / 100;
  const H = today(); const ops = []; const put = (col, obj) => { ops.push({ op: "put", col, obj }); return obj; };
  const now = new Date().toISOString(); let seq = 0; const crt = () => new Date(Date.parse("2024-01-01") + (seq++) * 1000).toISOString();
  const pay = (venc, atrasoMax = 0) => { const p = atrasoMax ? addDays(venc, Math.floor(rnd() * atrasoMax)) : venc; return p <= H ? p : ""; };
  // configuração e cadastros
  put("cfg", { id: "main", fazenda: "Fazenda Santa Clara (exemplo)", produtor: "Produtor Rural Exemplo", documento: "000.000.000-00", municipio: "Nova Venécia / ES", dataAbertura: "2024-07-01", caixaInicial: 1450000, capitalSocial: 3000000, funruralPct: 1.5, exemplo: true });
  DEFAULT_CATEGORIAS.forEach(c => put("categorias", { ...c }));
  const CU = { cafe: "cu_cafe", pim: "cu_pimenta", soja: "cu_soja", milho: "cu_milho" };
  put("culturas", { id: CU.cafe, nome: "Café conilon", unidade: "sc", kgUnidade: 60, precoRef: 1320, tipo: "perene" });
  put("culturas", { id: CU.pim, nome: "Pimenta-do-reino", unidade: "kg", kgUnidade: 1, precoRef: 12.8, tipo: "perene" });
  put("culturas", { id: CU.soja, nome: "Soja", unidade: "sc", kgUnidade: 60, precoRef: 124, tipo: "anual" });
  put("culturas", { id: CU.milho, nome: "Milho", unidade: "sc", kgUnidade: 60, precoRef: 61, tipo: "anual" });
  put("culturas", { id: "cu_feijao", nome: "Feijão", unidade: "sc", kgUnidade: 60, precoRef: 230, tipo: "anual" });
  const SF = [["sf2425", "2024/25", "2024-07-01", "2025-06-30"], ["sf2526", "2025/26", "2025-07-01", "2026-06-30"], ["sf2627", "2026/27", "2026-07-01", "2027-06-30"]];
  SF.forEach(([id, nome, inicio, fim]) => put("safras", { id, nome, inicio, fim }));
  const TAL = [["t01", "T01 Conilon clonal Vitória", 20, CU.cafe, "Vitória Incaper 8142", 2016, "3,0 x 1,0 m", true], ["t02", "T02 Conilon Diamante", 18, CU.cafe, "Diamante ES8112", 2018, "3,0 x 1,1 m", true], ["t03", "T03 Conilon Jequitibá", 12, CU.cafe, "Jequitibá ES8122", 2020, "3,2 x 1,0 m", true],
    ["t04", "T04 Pimenta Bragantina", 9, CU.pim, "Bragantina", 2019, "2,5 x 2,0 m", true], ["t05", "T05 Pimenta Kottanadan", 6, CU.pim, "Kottanadan", 2021, "2,5 x 2,0 m", true],
    ["t06", "T06 Lavoura grãos – Baixada", 80, CU.soja, "Soja ciclo médio", "", "0,45 m", false], ["t07", "T07 Lavoura grãos – Chapada", 45, CU.milho, "Milho híbrido", "", "0,50 m", false]];
  TAL.forEach(([id, nome, area, culturaId, variedade, anoPlantio, espacamento, irrigado]) => put("talhoes", { id, nome, area, culturaId, variedade, anoPlantio, espacamento, irrigado, ativo: true }));
  const tal = id => TAL.find(t => t[0] === id);
  // insumos: id, nome, grupo, unidade, preço base, mínimo
  const INS = [["i_2020", "Formulado NPK 20-00-20", "Fertilizante", "kg", 3.55, 3000], ["i_ureia", "Ureia 46% N", "Fertilizante", "kg", 3.1, 400], ["i_kcl", "Cloreto de potássio 60%", "Fertilizante", "kg", 3.3, 1500], ["i_map", "MAP 11-52-00", "Fertilizante", "kg", 4.7, 800],
    ["i_calc", "Calcário dolomítico PRNT 90", "Corretivo", "t", 185, 5], ["i_boro", "Ácido bórico 17% B", "Fertilizante", "kg", 9.2, 30], ["i_gli", "Glifosato 480 SL", "Herbicida", "L", 27, 80], ["i_fung", "Fungicida triazol + estrobilurina", "Fungicida", "L", 178, 25],
    ["i_inset", "Inseticida tiametoxam + lambda-cialotrina", "Inseticida", "L", 142, 10], ["i_oleo", "Óleo mineral adjuvante", "Adjuvante", "L", 17.5, 30], ["i_sem_soja", "Semente de soja tratada (sc 40 kg)", "Semente / muda", "sc", 385, 0], ["i_sem_milho", "Semente de milho híbrido (sc 60 mil)", "Semente / muda", "sc", 1120, 0],
    ["i_diesel", "Óleo diesel S10", "Combustível", "L", 6.25, 1500], ["i_sacaria", "Sacaria de ráfia 60 kg", "Sacaria e embalagens", "un", 2.9, 0]];
  INS.forEach(([id, nome, grupo, unidade, , min]) => put("insumos", { id, nome, grupo, unidade, estoqueMin: min, categoriaId: INSUMO_CAT_DEFAULT[grupo], local: grupo === "Combustível" ? "Tanque 15 mil L" : "Galpão de insumos", fabricante: "" }));
  const price = (id, data) => { const b = INS.find(x => x[0] === id)[4]; const yrs = daysBetween("2024-07-01", data) / 365; return r2(vary(b * Math.pow(1.055, yrs), 0.035)); };
  const FORN = { Fertilizante: "AgroFertil Distribuidora", Corretivo: "Mineradora Calcário Norte", Herbicida: "Cooperativa Agro Capixaba", Fungicida: "Cooperativa Agro Capixaba", Inseticida: "Defensa Agroquímicos", Adjuvante: "Defensa Agroquímicos", "Semente / muda": "Sementes Planalto", Combustível: "Posto Rodovia Ltda", "Sacaria e embalagens": "Embalagens Vale do Rio Doce" };
  // estoque e compras
  const stock = {}; INS.forEach(i => stock[i[0]] = 0);
  const lanc = o => put("lancamentos", { origem: "manual", criado: crt(), ...o, id: uid("l"), valor: r2(o.valor) });
  const compra = (insId, data, qtd) => {
    const i = INS.find(x => x[0] === insId); const pu = price(insId, data); const mid = uid("m"), lid = uid("l"); const prazo = [30, 45, 60, 90][Math.floor(rnd() * 4)]; const venc = addDays(data, prazo);
    put("movimentos", { id: mid, insumoId: insId, data, subtipo: "compra", qtd, valorUnit: pu, fornecedor: FORN[i[2]] || "Fornecedor", documento: String(10000 + Math.floor(rnd() * 89999)), lote: "L" + data.replace(/-/g, "").slice(2) + Math.floor(rnd() * 90 + 10), validade: ["Fungicida", "Inseticida", "Herbicida", "Adjuvante"].includes(i[2]) ? addMonths(data, 14 + Math.floor(rnd() * 10)) : "", lancId: lid, criado: crt() });
    put("lancamentos", { id: lid, categoriaId: "c_compra_ins", descricao: `Compra de ${i[1]} – ${nf(qtd, 2)} ${i[3]}`, valor: qtd * pu, competencia: data, vencimento: venc, pagamento: pay(venc, 3), contraparte: FORN[i[2]] || "Fornecedor", origem: "compra", movId: mid, criado: crt() });
    stock[insId] += qtd;
  };
  const aplica = (insId, data, qtd, destino, talhaoId, safraId, operacao) => {
    if (data > H || qtd <= 0) return;
    const i = INS.find(x => x[0] === insId);
    if (stock[insId] < qtd) { const falta = qtd - stock[insId]; const lote = i[3] === "t" ? Math.ceil(falta * 1.3) : i[3] === "sc" ? Math.ceil(falta * 1.05) : Math.ceil(falta * 1.6 / 100) * 100; compra(insId, addDays(data, -Math.floor(4 + rnd() * 10)), lote); }
    stock[insId] -= qtd;
    put("movimentos", { id: uid("m"), insumoId: insId, data, subtipo: "aplicacao", qtd: r2(qtd), destino, talhaoId: talhaoId || "", culturaId: talhaoId ? tal(talhaoId)[3] : "", safraId, operacao, responsavel: ["José Carlos", "Antônio", "Marcos"][Math.floor(rnd() * 3)], criado: crt() });
  };
  // saldo inicial de insumos na implantação
  [["i_2020", 12000], ["i_ureia", 3000], ["i_gli", 220], ["i_fung", 30], ["i_diesel", 6500], ["i_oleo", 80], ["i_sacaria", 1200]].forEach(([id, q]) => { put("movimentos", { id: uid("m"), insumoId: id, data: "2024-07-01", subtipo: "saldo_inicial", qtd: q, valorUnit: r2(INS.find(x => x[0] === id)[4] * 0.97), obs: "Inventário de implantação", criado: crt() }); stock[id] += q; });
  // programa de aplicações por cultura: [insumo, dose/ha, mês (offset desde julho), operação]
  const PROG = {
    [CU.cafe]: [["i_calc", 1.5, 1, "Calagem / gessagem"], ["i_gli", 1.5, 2, "Pulverização herbicida"], ["i_2020", 380, 3, "Adubação de solo"], ["i_boro", 8, 3, "Adubação foliar"], ["i_ureia", 150, 4, "Adubação de solo"], ["i_fung", 0.8, 4, "Pulverização fungicida"], ["i_2020", 380, 5, "Adubação de solo"], ["i_inset", 0.6, 5, "Pulverização inseticida"], ["i_ureia", 150, 6, "Adubação de solo"], ["i_fung", 0.8, 6, "Pulverização fungicida"], ["i_gli", 1.5, 6, "Pulverização herbicida"], ["i_2020", 380, 7, "Adubação de solo"], ["i_sacaria", 22, 10, "Colheita"], ["i_sacaria", 22, 11, "Colheita"]],
    [CU.pim]: [["i_calc", 1, 1, "Calagem / gessagem"], ["i_2020", 300, 3, "Adubação de solo"], ["i_fung", 1, 4, "Pulverização fungicida"], ["i_2020", 300, 5, "Adubação de solo"], ["i_inset", 0.7, 5, "Pulverização inseticida"], ["i_ureia", 120, 6, "Adubação de solo"], ["i_fung", 1, 7, "Pulverização fungicida"], ["i_2020", 300, 8, "Adubação de solo"]],
    [CU.soja]: [["i_gli", 3, 2, "Pulverização herbicida"], ["i_sem_soja", 1.25, 3, "Plantio / replantio"], ["i_map", 220, 3, "Adubação de solo"], ["i_kcl", 140, 4, "Adubação de solo"], ["i_gli", 2, 4, "Pulverização herbicida"], ["i_fung", 0.5, 5, "Pulverização fungicida"], ["i_inset", 0.4, 5, "Pulverização inseticida"], ["i_oleo", 0.5, 5, "Pulverização fungicida"], ["i_fung", 0.5, 6, "Pulverização fungicida"]],
    [CU.milho]: [["i_gli", 3, 3, "Pulverização herbicida"], ["i_sem_milho", 1.05, 4, "Plantio / replantio"], ["i_map", 200, 4, "Adubação de solo"], ["i_ureia", 240, 5, "Adubação de solo"], ["i_inset", 0.4, 5, "Pulverização inseticida"], ["i_oleo", 0.4, 5, "Pulverização inseticida"]]
  };
  const PRODV = { [CU.cafe]: [64, 68, 0], [CU.pim]: [2750, 3050, 0], [CU.soja]: [56, 61, 0], [CU.milho]: [138, 152, 0] }; // por safra
  const PRECO = { [CU.cafe]: [1480, 1290], [CU.pim]: [13.6, 12.4], [CU.soja]: [128, 121], [CU.milho]: [63, 58] };
  const colhMes = { [CU.cafe]: [9, 10, 11], [CU.pim]: [10, 11], [CU.soja]: [7, 8], [CU.milho]: [8, 9] };
  SF.forEach(([sid, , ini], si) => {
    const mdate = (off, day) => { const d = addMonths(ini, off); return d.slice(0, 8) + pad(Math.min(28, day)); };
    TAL.forEach(([tid, , area, cult]) => {
      PROG[cult].forEach(([ins, dose, off, op]) => { if (ins === "i_sacaria" && si === 2) return; aplica(ins, mdate(off, 5 + Math.floor(rnd() * 20)), r2(vary(dose * area, 0.05)), "talhao", tid, sid, op); });
      // colheita
      if (PRODV[cult][si] > 0) {
        const total = vary(PRODV[cult][si] * area, 0.07); const ms = colhMes[cult]; const w = ms.map((_, i) => i === 0 ? 0.3 : i === ms.length - 1 ? 0.25 : 0.45); const ws = sum(w);
        ms.forEach((off, i) => { const data = mdate(off, 8 + Math.floor(rnd() * 15)); if (data > H) return; put("colheitas", { id: uid("h"), data, talhaoId: tid, culturaId: cult, safraId: sid, qtd: Math.round(total * w[i] / ws * (cult === CU.pim ? 1 : 10)) / (cult === CU.pim ? 1 : 10), classificacao: cult === CU.cafe ? ["Tipo 7, peneira 13 acima", "Tipo 7/8 BC", "Tipo 6, peneira 15"][Math.floor(rnd() * 3)] : cult === CU.pim ? "Pimenta preta tipo B" : "Padrão comercial", umidade: cult === CU.cafe ? 12 : cult === CU.pim ? 13 : 13.5, armazem: cult === CU.cafe || cult === CU.pim ? "Armazém sede" : "Silo bag", criado: crt() }); });
      }
    });
    // diesel por rateio e sede
    for (let m = 0; m < 12; m++) { aplica("i_diesel", mdate(m, 12), Math.round(vary(2300, 0.15)), "rateio", "", sid, "Abastecimento de máquinas"); aplica("i_diesel", mdate(m, 25), Math.round(vary(140, 0.2)), "adm", "", sid, "Abastecimento de máquinas"); }
  });
  // perdas e ajustes
  [["i_fung", "2025-03-18", 6, "vencido", "Lote vencido descartado via logística reversa"], ["i_ureia", "2025-11-10", 350, "perda", "Sacos rasgados por umidade no galpão"], ["i_gli", "2026-06-30", 12, "ajuste_neg", "Diferença no inventário semestral"], ["i_2020", "2025-12-30", 180, "ajuste_pos", "Sobra identificada no inventário"]].forEach(([ins, data, qtd, subtipo, obs]) => put("movimentos", { id: uid("m"), insumoId: ins, data, subtipo, qtd, obs, criado: crt() }));
  // custos e despesas recorrentes (julho/2024 até 4 meses à frente)
  const fim = monthEnd(addMonths(H, 4)); let k = "2024-07-01";
  while (k <= fim) {
    const sid = SF.find(s => k >= s[2] && k <= s[3])[0]; const mo = +k.slice(5, 7); const yr = +k.slice(0, 4); const inf = Math.pow(1.05, (yr - 2024) + (mo >= 5 ? 0.5 : 0));
    const exp = (cat, desc, v, dia, extra = {}, venc5 = 5) => { const comp = k.slice(0, 8) + pad(dia); const venc = addDays(comp, venc5); lanc({ categoriaId: cat, descricao: desc, valor: v, competencia: comp, vencimento: venc, pagamento: pay(venc, 2), safraId: GRUPOS[(DEFAULT_CATEGORIAS.find(c => c.id === cat) || {}).grupo] && ["custo"].includes(DEFAULT_CATEGORIAS.find(c => c.id === cat).grupo) ? sid : "", ...extra }); };
    exp("c_mo_fixa", `Folha de campo – café ${fmtM(k)} (8 colaboradores)`, vary(41000 * inf, 0.03), 28, { culturaId: CU.cafe, contraparte: "Folha de pagamento" }, 7);
    exp("c_mo_fixa", `Folha de campo – pimenta ${fmtM(k)} (3 colaboradores)`, vary(14500 * inf, 0.03), 28, { culturaId: CU.pim, contraparte: "Folha de pagamento" }, 7);
    exp("c_mo_fixa", `Operadores de máquinas – grãos ${fmtM(k)}`, vary(9000 * inf, 0.03), 28, { contraparte: "Folha de pagamento", obs: "Rateado por área" }, 7);
    exp("c_sal_adm", `Folha administrativa ${fmtM(k)}`, vary(17500 * inf, 0.02), 28, { contraparte: "Folha de pagamento" }, 7);
    exp("c_prolabore", `Pró-labore ${fmtM(k)}`, 25000, 28, { contraparte: "Sócio administrador" }, 2);
    exp("c_contab", `Honorários contábeis ${fmtM(k)}`, 4600 * inf, 10, { contraparte: "Contabilidade Rural Norte" });
    exp("c_util", `Energia, telefone e internet da sede ${fmtM(k)}`, vary(2300, 0.1), 15, { contraparte: "EDP / Operadora" });
    exp("c_adm_out", `Material de escritório e despesas gerais ${fmtM(k)}`, vary(1600, 0.25), 20, { contraparte: "Diversos" });
    exp("c_tarifas", `Tarifas bancárias ${fmtM(k)}`, vary(640, 0.1), 28, { contraparte: "Banco do Brasil" }, 0);
    const seca = [8, 9, 10, 11, 12, 1, 2, 3].includes(mo) ? 1.35 : 0.7;
    exp("c_energia", `Energia irrigação café ${fmtM(k)}`, vary(13500 * seca * inf, 0.08), 18, { culturaId: CU.cafe, contraparte: "EDP Espírito Santo" });
    exp("c_energia", `Energia irrigação pimenta ${fmtM(k)}`, vary(4100 * seca * inf, 0.08), 18, { culturaId: CU.pim, contraparte: "EDP Espírito Santo" });
    if (mo % 2 === 0) exp("c_manut", `Manutenção de tratores e implementos`, vary(21000 * inf, 0.3), 14, { contraparte: "Oficina Agromecânica Norte" }, 20);
    if (mo % 3 === 1) exp("c_assist", `Assistência agronômica e análises de solo/folha`, vary(9500 * inf, 0.1), 5, { contraparte: "Consultoria AgroTécnica" }, 15);
    if (mo === 10) exp("c_seguro_agr", `Seguro agrícola soja e milho`, 41000 * inf, 15, { contraparte: "Seguradora Rural" }, 30);
    if (mo === 9) exp("c_itr", `ITR e licenças ambientais`, 7200 * inf, 30, { contraparte: "Receita Federal / IEMA" }, 0);
    if (mo === 3) exp("c_seg_ger", `Seguro de máquinas, veículos e benfeitorias`, 16500 * inf, 10, { contraparte: "Seguradora Rural" }, 20);
    if (mo === 4 || mo === 5 || mo === 6) exp("c_mo_temp", `Apanha de café conilon – ${fmtM(k)}`, vary(98000 * inf, 0.08), 25, { culturaId: CU.cafe, contraparte: "Turma de apanhadores" }, 3);
    if (mo === 5 || mo === 6) exp("c_mo_temp", `Colheita de pimenta – ${fmtM(k)}`, vary(31000 * inf, 0.1), 26, { culturaId: CU.pim, contraparte: "Turma de colheita" }, 3);
    if (mo === 5 || mo === 6) exp("c_secagem", `Secagem e beneficiamento de café – ${fmtM(k)}`, vary(36000 * inf, 0.1), 27, { culturaId: CU.cafe, contraparte: "Beneficiadora Vale Verde" }, 15);
    if (mo === 2) exp("c_serv", `Colheita mecanizada de soja (terceirizada)`, 80 * 360 * inf, 26, { talhaoId: "t06", culturaId: CU.soja, contraparte: "Prestadora Agro Serviços" }, 15);
    if (mo === 3) exp("c_serv", `Colheita mecanizada de milho (terceirizada)`, 45 * 390 * inf, 26, { talhaoId: "t07", culturaId: CU.milho, contraparte: "Prestadora Agro Serviços" }, 15);
    if (mo === 10) exp("c_serv", `Plantio e pulverização terceirizados – grãos`, 125 * 140 * inf, 20, { contraparte: "Prestadora Agro Serviços" }, 15);
    if (k < H.slice(0, 8) + "01") exp("c_rend", `Rendimento de aplicação financeira ${fmtM(k)}`, vary(4200, 0.4), 28, { contraparte: "Banco do Brasil" }, 0);
    k = addMonths(k, 1);
  }
  // títulos em atraso para ilustrar alertas
  lanc({ categoriaId: "c_manut", descricao: "Retífica do motor do trator MF 4292", valor: 18700, competencia: addDays(H, -40), vencimento: addDays(H, -12), pagamento: "", contraparte: "Oficina Agromecânica Norte" });
  // IR, distribuições, investimentos sem cadastro
  lanc({ categoriaId: "c_irpj", descricao: "IR atividade rural – ano-base 2024", valor: 68000, competencia: "2025-04-30", vencimento: "2025-04-30", pagamento: "2025-04-30", contraparte: "Receita Federal" });
  lanc({ categoriaId: "c_irpj", descricao: "IR atividade rural – ano-base 2025", valor: 214000, competencia: "2026-04-30", vencimento: "2026-04-30", pagamento: "2026-04-30", contraparte: "Receita Federal" });
  lanc({ categoriaId: "c_distrib", descricao: "Distribuição de lucros aos sócios", valor: 450000, competencia: "2025-08-20", vencimento: "2025-08-20", pagamento: "2025-08-20", contraparte: "Sócios" });
  lanc({ categoriaId: "c_distrib", descricao: "Distribuição de lucros aos sócios", valor: 1100000, competencia: "2026-08-20", vencimento: "2026-08-20", pagamento: "2026-08-20", contraparte: "Sócios" });
  lanc({ categoriaId: "c_inv_outros", descricao: "Reforma do terreiro de secagem", valor: 64000, competencia: "2025-05-12", vencimento: "2025-05-12", pagamento: "2025-05-12", contraparte: "Construtora Rural" });
  // vendas
  const vendasPlan = [
    [CU.cafe, "sf2425", "2025-06-18", 0.25, 1545, "Cooperativa Cafeicultores do Norte"], [CU.cafe, "sf2425", "2025-08-12", 0.25, 1480, "Exportadora Atlântico Café"], [CU.cafe, "sf2425", "2025-10-21", 0.2, 1395, "Cooperativa Cafeicultores do Norte"], [CU.cafe, "sf2425", "2026-01-15", 0.2, 1420, "Exportadora Atlântico Café"], [CU.cafe, "sf2425", "2026-03-10", 0.1, 1360, "Torrefação Capixaba"],
    [CU.pim, "sf2425", "2025-07-08", 0.5, 13.9, "Exportadora Pimenta Brasil"], [CU.pim, "sf2425", "2025-09-16", 0.5, 13.3, "Exportadora Pimenta Brasil"],
    [CU.soja, "sf2425", "2025-03-20", 0.6, 129, "Trading Grãos Sudeste"], [CU.soja, "sf2425", "2025-04-25", 0.4, 126, "Trading Grãos Sudeste"],
    [CU.milho, "sf2425", "2025-04-28", 0.5, 64, "Granja Avícola São José"], [CU.milho, "sf2425", "2025-06-10", 0.5, 62, "Cerealista Linhares"],
    [CU.cafe, "sf2526", "2026-06-25", 0.25, 1340, "Exportadora Atlântico Café"], [CU.cafe, "sf2526", "2026-08-18", 0.2, 1295, "Cooperativa Cafeicultores do Norte"], [CU.cafe, "sf2526", "2026-10-06", 0.15, 1270, "Exportadora Atlântico Café"], [CU.cafe, "sf2526", addDays(H, -6), 0.1, 1310, "Torrefação Capixaba"],
    [CU.pim, "sf2526", "2026-07-14", 0.55, 12.6, "Exportadora Pimenta Brasil"], [CU.pim, "sf2526", "2026-09-29", 0.3, 12.1, "Exportadora Pimenta Brasil"],
    [CU.soja, "sf2526", "2026-03-18", 0.7, 122, "Trading Grãos Sudeste"], [CU.soja, "sf2526", "2026-05-12", 0.3, 119, "Trading Grãos Sudeste"],
    [CU.milho, "sf2526", "2026-04-22", 0.6, 59, "Granja Avícola São José"], [CU.milho, "sf2526", "2026-07-08", 0.4, 57, "Cerealista Linhares"]
  ];
  const colhTot = {}; ops.filter(o => o.col === "colheitas").forEach(o => { const kk = o.obj.culturaId + "|" + o.obj.safraId; colhTot[kk] = (colhTot[kk] || 0) + o.obj.qtd; });
  vendasPlan.forEach(([cult, sid, data, frac, pu, comp]) => {
    if (data > H) return; const tot = colhTot[cult + "|" + sid] || 0; if (!tot) return;
    const qtd = cult === CU.pim ? Math.round(tot * frac) : Math.round(tot * frac * 10) / 10; const bruto = qtd * pu; const vendaId = uid("v");
    const prazo = cult === CU.cafe ? 20 : cult === CU.pim ? 30 : 15; const venc = addDays(data, prazo); const pg = pay(venc, 2);
    const nomeC = { [CU.cafe]: "Café conilon", [CU.pim]: "Pimenta-do-reino", [CU.soja]: "Soja", [CU.milho]: "Milho" }[cult]; const un = cult === CU.pim ? "kg" : "sc";
    put("lancamentos", { id: uid("l"), categoriaId: "c_venda", descricao: `Venda de ${nomeC} – ${nf(qtd, 1)} ${un}`, valor: r2(bruto), competencia: data, vencimento: venc, pagamento: pg, contraparte: comp, documento: "NF-e " + (2000 + Math.floor(rnd() * 900)), culturaId: cult, safraId: sid, qtd, origem: "venda", vendaId, criado: crt() });
    put("lancamentos", { id: uid("l"), categoriaId: "c_funrural", descricao: `Funrural retido – venda de ${nomeC}`, valor: r2(bruto * 0.015), competencia: data, vencimento: venc, pagamento: pg, contraparte: comp, culturaId: cult, safraId: sid, origem: "venda", vendaId, criado: crt() });
    if (cult === CU.soja || cult === CU.milho) put("lancamentos", { id: uid("l"), categoriaId: "c_frete", descricao: `Frete – venda de ${nomeC}`, valor: r2(qtd * (cult === CU.soja ? 7.5 : 6.8)), competencia: data, vencimento: data, pagamento: pay(data), contraparte: "Transportadora Rota Norte", culturaId: cult, safraId: sid, origem: "venda", vendaId, criado: crt() });
    if (cult === CU.cafe) put("lancamentos", { id: uid("l"), categoriaId: "c_corretagem", descricao: `Corretagem – venda de ${nomeC}`, valor: r2(bruto * 0.005), competencia: data, vencimento: addDays(data, 10), pagamento: pay(addDays(data, 10)), contraparte: "Corretora Café Norte", culturaId: cult, safraId: sid, origem: "venda", vendaId, criado: crt() });
  });
  // patrimônio
  const ATV = [["Terras – 210 ha (custo histórico)", "terra", "2008-03-10", 3600000, 0, 0], ["Sede, armazém e terreiro", "benf", "2012-06-01", 980000, 25, 0], ["Sistema de irrigação por gotejamento – café e pimenta", "irr", "2018-08-15", 640000, 12, 40000],
    ["Lavoura de café conilon – formação", "lav", "2016-10-01", 520000, 18, 0], ["Lavoura de pimenta-do-reino – formação", "lav", "2019-11-01", 230000, 12, 0], ["Trator MF 4292 4x4", "maq", "2019-05-20", 310000, 10, 60000],
    ["Pulverizador de barras 2.000 L", "maq", "2020-09-10", 165000, 10, 20000], ["Caminhonete Hilux cabine dupla", "vei", "2022-02-14", 245000, 5, 90000], ["Computadores e mobiliário do escritório", "moveis", "2023-03-01", 38000, 5, 0]];
  ATV.forEach(([descricao, tipo, dataAquisicao, valor, vidaUtil, residual]) => put("ativos", { id: uid("a"), descricao, tipo, dataAquisicao, valor, vidaUtil, residual, origem: "abertura" }));
  const trator = put("ativos", { id: uid("a"), descricao: "Trator John Deere 6110J 4x4", tipo: "maq", dataAquisicao: "2025-09-10", valor: 548000, vidaUtil: 10, residual: 110000, origem: "compra", parcelas: 1, aVista: true, identificacao: "Chassi 1BM6110JXPD000123" });
  lanc({ categoriaId: "c_inv_imob", descricao: "Trator John Deere 6110J 4x4 – parcela 1/1", valor: 548000, competencia: "2025-09-10", vencimento: "2025-09-10", pagamento: "2025-09-10", contraparte: "Concessionária Agro Norte", origem: "ativo", ativoId: trator.id });
  const secador = put("ativos", { id: uid("a"), descricao: "Secador rotativo de café 15.000 L", tipo: "maq", dataAquisicao: "2026-03-15", valor: 186000, vidaUtil: 15, residual: 15000, origem: "compra", parcelas: 4, primeiroVenc: "2026-04-15" });
  for (let i = 0; i < 4; i++) { const v = addMonths("2026-04-15", i * 3); lanc({ categoriaId: "c_inv_imob", descricao: `Secador rotativo de café – parcela ${i + 1}/4`, valor: 46500, competencia: "2026-03-15", vencimento: v, pagamento: pay(v), contraparte: "Pinhalense Máquinas", origem: "ativo", ativoId: secador.id }); }
  // financiamentos
  const k1 = put("contratos", { id: uid("k"), banco: "Sicoob Norte", linha: "Investimento – irrigação", finalidade: "investimento", numero: "CCB 2021/0457", taxa: 9.5, saldoInicial: 320000, existente: true, garantia: "Alienação fiduciária do sistema" });
  ops.push(...gerarCronograma(k1, { valor: 320000, liberacao: "2024-07-01", nParc: 4, periodo: 12, carencia: 0, sistema: "sac", taxa: 9.5, primeiroVenc: "2025-03-20", existente: true }));
  const k2 = put("contratos", { id: uid("k"), banco: "Banco do Brasil", linha: "Pronamp custeio 2024/25", finalidade: "custeio", numero: "40/04512-3", taxa: 8, saldoInicial: 0, garantia: "Penhor da safra" });
  ops.push(...gerarCronograma(k2, { valor: 1000000, liberacao: "2024-09-05", nParc: 1, periodo: 12, carencia: 0, sistema: "sac", taxa: 8, primeiroVenc: "2025-07-15" }));
  const k3 = put("contratos", { id: uid("k"), banco: "Banco do Brasil", linha: "Pronamp custeio 2025/26", finalidade: "custeio", numero: "40/05213-8", taxa: 8, saldoInicial: 0, garantia: "Penhor da safra" });
  ops.push(...gerarCronograma(k3, { valor: 780000, liberacao: "2025-09-02", nParc: 1, periodo: 12, carencia: 0, sistema: "sac", taxa: 8, primeiroVenc: "2026-07-15" }));
  const k4 = put("contratos", { id: uid("k"), banco: "Banco do Brasil", linha: "Moderfrota – trator", finalidade: "investimento", numero: "40/05301-1", taxa: 10.5, saldoInicial: 0, garantia: "Alienação fiduciária do trator" });
  ops.push(...gerarCronograma(k4, { valor: 470000, liberacao: "2025-09-08", nParc: 6, periodo: 12, carencia: 12, sistema: "sac", taxa: 10.5, primeiroVenc: "2026-09-08" }));
  const k5 = put("contratos", { id: uid("k"), banco: "Sicredi", linha: "Pronamp custeio 2026/27", finalidade: "custeio", numero: "C2026/88412", taxa: 8.5, saldoInicial: 0, garantia: "Penhor da safra" });
  ops.push(...gerarCronograma(k5, { valor: 850000, liberacao: "2026-09-04", nParc: 1, periodo: 12, carencia: 0, sistema: "sac", taxa: 8.5, primeiroVenc: "2027-07-15" }));
  // ajusta pagamentos gerados pelo cronograma para refletir hoje
  ops.forEach(o => { if (o.col === "lancamentos" && o.obj.origem === "contrato") o.obj.pagamento = o.obj.vencimento <= H ? o.obj.vencimento : ""; });
  // orçamentos das safras 2025/26 e 2026/27 a partir da estrutura de custos realizada
  const buildOrc = (sidBase, sidAlvo, fator, premissas) => {
    const s = SF.find(x => x[0] === sidBase); const ms = monthsInRange(s[2], s[3]); const map = new Map(); const add = (c, d, v) => { const j = ms.indexOf(monthKey(d)); if (j < 0) return; if (!map.has(c)) map.set(c, new Array(12).fill(0)); map.get(c)[j] += v; };
    ops.forEach(o => {
      if (o.col === "lancamentos") { const l = o.obj; const g = (DEFAULT_CATEGORIAS.find(c => c.id === l.categoriaId) || {}).grupo; if (!g || ["receita", "compra_insumo", "investimento"].includes(g) || l.categoriaId === "c_funrural" || l.categoriaId === "c_rend" || l.origem === "venda") return; if (l.competencia >= s[2] && l.competencia <= s[3]) add(l.categoriaId, l.competencia, l.valor); }
      if (o.col === "movimentos" && o.obj.subtipo === "aplicacao" && o.obj.destino !== "adm") { const m = o.obj; if (m.safraId !== sidBase) return; const ins = INS.find(x => x[0] === m.insumoId); add(INSUMO_CAT_DEFAULT[ins[2]], m.data, m.qtd * ins[4] * 1.03); }
    });
    const linhas = [...map.entries()].map(([c, v]) => ({ id: uid("ol"), categoriaId: c, valores: v.map(x => Math.round(x * fator * vary(1, 0.06))) }));
    put("orcamentos", { id: sidAlvo, safraId: sidAlvo, premissas, linhas });
  };
  const premBase = (prodF, precoF) => [[CU.cafe, 50, 70, 1300, 60, 11, 2], [CU.pim, 15, 3000, 12.5, 85, 0, 3], [CU.soja, 80, 60, 120, 100, 8, 2], [CU.milho, 45, 150, 58, 100, 9, 3]].map(([culturaId, area, p, pr, pctVenda, mesVenda, mesesVenda]) => ({ culturaId, area, produtividade: Math.round(p * prodF), preco: r2(pr * precoF), pctVenda, mesVenda, mesesVenda }));
  buildOrc("sf2526", "sf2526", 0.94, premBase(1.04, 1.02));
  buildOrc("sf2526", "sf2627", 1.05, premBase(1.02, 1.0));
  return ops;
}

/* ================= INICIALIZAÇÃO ================= */
async function boot() {
  await Store.init();
  bootUI();
}
function bootUI() {
  if (S.cfg.get("main")) initPeriod();
  $("#perPreset").addEventListener("change", ev => { const p = presets().find(x => x[0] === ev.target.value); if (p && p[0] !== "custom") setPeriod(p[2], p[3], p[0]); });
  $("#perFrom").addEventListener("change", ev => setPeriod(ev.target.value, P.to));
  $("#perTo").addEventListener("change", ev => setPeriod(P.from, ev.target.value));
  $("#menuBtn").addEventListener("click", () => $("#side").classList.toggle("open"));
  $("#nav").addEventListener("click", ev => { if (ev.target.closest("a")) $("#side").classList.remove("open"); });
  window.addEventListener("hashchange", () => { if (VIEW.dirty && routeName() !== "orcamento") { VIEW.dirty = false; ORC_EDIT = null; } render(false); window.scrollTo(0, 0); });
  render(false);
  if (S.cfg.get("main") && !P.from) initPeriod();
}
const _renderBase = render;
render = function (keep) { if (S.cfg.get("main") && !P.from) initPeriod(); return _renderBase(keep); };
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
bootSupabase();
