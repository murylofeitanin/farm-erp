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
