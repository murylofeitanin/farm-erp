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
