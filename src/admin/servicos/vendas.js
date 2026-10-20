// Contas de vendas do painel, feitas só com as reservas que vêm do banco (nada estimado).
// Venda = reserva confirmada pela loja (pagamento visto ou separada para pagar no balcão) ou já retirada.
// A data da venda é a da confirmação; reservas antigas sem essa data usam a data do pedido.

export const CORES = ["#ecb621", "#4ade80", "#60a5fa", "#c084fc", "#f87171", "#737b87"];

// "R$ 1,2 mil" para eixos e rótulos curtos
export function moedaCurta(v) {
    if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
    if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
    return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}

export const PERIODOS = [
    { id: "7d", rotulo: "7 dias", dias: 7 },
    { id: "30d", rotulo: "30 dias", dias: 30 },
    { id: "90d", rotulo: "90 dias", dias: 90 },
    { id: "12m", rotulo: "12 meses", dias: 365 },
];

export const ROTULO_METODO = { pix: "Pix", cartao: "Cartão", boleto: "Boleto", loja: "No balcão" };
export const ROTULO_STATUS = { aguardando: "Aguardando a loja", confirmado: "Pronta para retirar", retirado: "Retirada", cancelado: "Cancelada" };

export const ehVenda = (r) => r.status === "confirmado" || r.status === "retirado";
export const dataDaVenda = (r) => new Date(r.confirmado_em || r.criado_em);

const inicioDoDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Início do período atual e do período anterior (para comparar), no horário do computador
export function intervalo(periodo, agora = new Date()) {
    const { dias } = PERIODOS.find((p) => p.id === periodo) || PERIODOS[1];
    const fim = agora;
    const inicio = inicioDoDia(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - (dias - 1)));
    const inicioAnterior = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() - dias);
    return { inicio, fim, inicioAnterior, dias };
}

const entre = (data, inicio, fim) => data >= inicio && data <= fim;

// Números principais de um intervalo
export function resumo(reservas, inicio, fim) {
    const vendas = reservas.filter((r) => ehVenda(r) && entre(dataDaVenda(r), inicio, fim));
    const receita = vendas.reduce((s, r) => s + Number(r.total), 0);
    const itens = vendas.reduce((s, r) => s + (r.reserva_itens || []).reduce((t, i) => t + i.quantidade, 0), 0);
    const pedidos = reservas.filter((r) => entre(new Date(r.criado_em), inicio, fim));
    const cancelados = pedidos.filter((r) => r.status === "cancelado").length;
    return {
        receita,
        vendas: vendas.length,
        itens,
        ticket: vendas.length ? receita / vendas.length : 0,
        pedidos: pedidos.length,
        cancelados,
        taxaCancelamento: pedidos.length ? cancelados / pedidos.length : 0,
    };
}

// Variação entre dois números: null quando não há base de comparação
export function variacao(atual, anterior) {
    if (!anterior) return atual ? { novo: true } : null;
    return { pct: (atual - anterior) / anterior };
}

// Receita e número de vendas por dia (ou por mês no período de 12 meses), com os dias sem venda zerados
export function serieDeReceita(reservas, periodo, agora = new Date()) {
    const { inicio, fim } = intervalo(periodo, agora);
    const porMes = periodo === "12m";
    const chave = (d) => (porMes ? `${d.getFullYear()}-${d.getMonth()}` : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    const pontos = [];
    const indice = new Map();
    if (porMes) {
        for (let i = 11; i >= 0; i--) {
            const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
            indice.set(chave(d), pontos.length);
            pontos.push({ data: d, valor: 0, vendas: 0 });
        }
    } else {
        for (let d = new Date(inicio); d <= fim; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
            indice.set(chave(d), pontos.length);
            pontos.push({ data: d, valor: 0, vendas: 0 });
        }
    }
    for (const r of reservas) {
        if (!ehVenda(r)) continue;
        const d = dataDaVenda(r);
        const i = indice.get(chave(d));
        if (i == null || !entre(d, porMes ? pontos[0].data : inicio, fim)) continue;
        pontos[i].valor += Number(r.total);
        pontos[i].vendas += 1;
    }
    return { pontos, porMes };
}

// Saldo de vendas por produto: unidades, receita, reservado em aberto e última venda
export function vendasPorProduto(reservas, inicio, fim) {
    const mapa = new Map();
    const linha = (item) => {
        const id = item.produto_id ?? `nome:${item.nome}`;
        if (!mapa.has(id)) mapa.set(id, { id, produtoId: item.produto_id, nome: item.nome, tipo: item.tipo, unidades: 0, receita: 0, emAberto: 0, ultima: null });
        return mapa.get(id);
    };
    for (const r of reservas) {
        const venda = ehVenda(r);
        const data = venda ? dataDaVenda(r) : new Date(r.criado_em);
        if (inicio && !entre(data, inicio, fim)) continue;
        for (const item of r.reserva_itens || []) {
            if (venda) {
                const l = linha(item);
                l.unidades += item.quantidade;
                l.receita += Number(item.preco_unitario) * item.quantidade;
                if (!l.ultima || data > l.ultima) l.ultima = data;
            } else if (r.status === "aguardando") {
                linha(item).emAberto += item.quantidade;
            }
        }
    }
    return [...mapa.values()];
}

// Soma por uma chave qualquer (forma de pagamento, situação…)
export function somarPor(lista, chave, valor = () => 1) {
    const mapa = new Map();
    for (const x of lista) {
        const k = chave(x);
        mapa.set(k, (mapa.get(k) || 0) + valor(x));
    }
    return [...mapa.entries()].map(([k, v]) => ({ chave: k, valor: v }));
}
