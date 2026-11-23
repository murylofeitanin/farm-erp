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
