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
