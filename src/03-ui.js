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
