// Funções da loja usadas em vários lugares: preços e parcelas, Pix, imagens, recomendações e situação das reservas.
const CDN_STEAM = "https://cdn.cloudflare.steamstatic.com/steam/apps";
const CDN_CAPTURAS = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps";

export const ehAcessorio = (item) => item?.tipo === "acessorio";

export const GARANTIA_MESES = 12;

// Loja física: todo pedido é uma reserva para retirar no balcão.
// Endereço e horário provisórios: troque aqui quando tiver os dados da loja.
export const LOJA = {
    nome: "Universal Games Celulares e Acessórios",
    endereco: "Endereço da loja (em breve)",
    horario: "Horário de atendimento (em breve)",
};

// Depois que a loja confirma o pagamento, a reserva fica separada por estes dias.
export const DIAS_PARA_RETIRAR = 7;

// Demonstração sem servidor: a "loja confirma o pagamento" alguns segundos depois da compra.
export const CONFIRMACAO_DEMO_MS = 20000;

const DIA_MS = 86400000;

// "Pagar na loja": a pessoa só reserva pelo site e paga no balcão, na hora de retirar.
export const pagaNaLoja = (pedido) => pedido.metodo === "loja";

// Situação de uma reserva: aguardando a loja (confirmar o pagamento ou separar os itens), pronta para retirar,
// retirada ou cancelada. Com o banco, quem decide é a loja pelo painel (pedido.situacaoLoja);
// sem banco (demonstração), a confirmação é simulada alguns segundos depois.
// Pedidos antigos (status "pago") contam como reservas confirmadas.
export function situacaoReserva(pedido, agora = Date.now()) {
    if (pedido.remoto) {
        const loja = pedido.situacaoLoja || {};
        if (loja.status === "cancelado") return { id: "cancelado", rotulo: "Cancelada" };
        if (loja.status === "retirado") return { id: "retirado", rotulo: "Retirado", retiradoEm: loja.retirado_em };
        if (loja.status !== "confirmado") return { id: "aguardando", rotulo: pagaNaLoja(pedido) ? "Separando itens" : "Aguardando confirmação" };
        const limite = new Date(loja.confirmado_em || pedido.data).getTime() + DIAS_PARA_RETIRAR * DIA_MS;
        if (agora > limite) return { id: "vencido", rotulo: "Prazo de retirada encerrado", limite };
        return { id: "pronto", rotulo: "Pronto para retirada", limite };
    }
    const feito = new Date(pedido.data).getTime();
    if (pedido.status === "cancelado" || pedido.status === "reembolsado") return { id: "cancelado", rotulo: "Cancelada" };
    const confirmadoEm = pedido.status === "pago" ? feito : feito + CONFIRMACAO_DEMO_MS;
    if (agora < confirmadoEm) return { id: "aguardando", rotulo: pagaNaLoja(pedido) ? "Separando itens" : "Aguardando confirmação", confirmadoEm };
    const limite = confirmadoEm + DIAS_PARA_RETIRAR * DIA_MS;
    if (agora > limite) return { id: "vencido", rotulo: "Prazo de retirada encerrado", limite };
    return { id: "pronto", rotulo: "Pronto para retirada", limite };
}

// Cada imagem no tamanho em que aparece: capa 600x900 só onde é grande, 300x450 nas miniaturas.
// jogo.imagens sobrescreve endereços que a Steam não publica no CDN antigo.
// Acessórios usam a ilustração própria (ou uma foto, se "ilustracao" for um caminho com extensão).
const SEM_IMAGEM = `${import.meta.env.BASE_URL}sem-imagem.svg`;

// Fotos de produto levam "#produto" no fim do endereço: o CSS mostra a foto inteira, sem cortar,
// em qualquer tela (cards, carrinho, checkout, painel). O "#..." não muda o arquivo baixado nem o cache.
export const marcarFotoProduto = (url) => (url && url !== SEM_IMAGEM && !/\.svg($|[?#])/i.test(url) && !url.includes("#") ? `${url}#produto` : url);

export function imagensDoJogo(jogo) {
    if (ehAcessorio(jogo)) {
        // URL enviada pelo painel, foto em public/ (com extensão) ou o nome de uma ilustração de public/acessorios
        const ilustracao = jogo.ilustracao;
        const arte = marcarFotoProduto(
            !ilustracao
                ? SEM_IMAGEM
                : /^(https?:)?\/\//.test(ilustracao)
                  ? ilustracao
                  : `${import.meta.env.BASE_URL}${/\.[a-z0-9]+$/i.test(ilustracao) ? ilustracao : `acessorios/${ilustracao}.svg`}`,
        );
        return { capa: arte, capaPequena: arte, banner: arte, logo: null, horizontal: arte, destaque: arte, linha: arte, fundo: null };
    }
    const base = `${CDN_STEAM}/${jogo.appId}`;
    return {
        capa: `${base}/library_600x900_2x.jpg`,
        capaPequena: `${base}/library_600x900.jpg`,
        banner: `${base}/library_hero.jpg`,
        logo: `${base}/logo.png`,
        horizontal: `${base}/header.jpg`,
        destaque: `${base}/capsule_616x353.jpg`,
        linha: `${base}/capsule_231x87.jpg`,
        fundo: jogo.fundo,
        ...jogo.imagens,
    };
}

export function capturasDoJogo(jogo) {
    // galeria enviada pelo painel tem prioridade sobre as capturas da Steam
    if (jogo.galeria?.length) return jogo.galeria.map((url) => ({ mini: url, grande: url }));
    return (jogo.capturas || []).map((caminho) => ({
        mini: `${CDN_CAPTURAS}/${jogo.appId}/${caminho}.600x338.jpg`,
        grande: `${CDN_CAPTURAS}/${jogo.appId}/${caminho}.1920x1080.jpg`,
    }));
}

// Trailer principal do jogo na Steam (stream HLS + miniatura).
export function trailerDoJogo(jogo) {
    if (!jogo.trailer) return null;
    const capturas = capturasDoJogo(jogo);
    return { ...jogo.trailer, poster: capturas[0]?.grande || imagensDoJogo(jogo).banner };
}

// Resumo de análises derivado da nota (0-10).
export function resumoAvaliacoes(nota) {
    if (nota >= 9.5) return "Aclamado";
    if (nota >= 8.5) return "Muito positivo";
    if (nota >= 7.8) return "Positivo";
    if (nota >= 7) return "Misto positivo";
    return "Misto";
}

const formatadorBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarPreco(valor) {
    return formatadorBRL.format(valor);
}

export function formatarData(iso, comHora = false) {
    return new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        ...(comHora ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
}

// Preço do momento. Com o banco, vem calculado por ele (precoFinal), o mesmo que o checkout cobra.
export function calcularPrecoFinal(jogo) {
    if (jogo.precoFinal != null) return jogo.precoFinal;
    return Math.round(jogo.preco * (100 - (jogo.desconto || 0))) / 100;
}

// Parcelamento sem juros: até 10x, com parcela mínima de R$ 10.
export function calcularParcelas(valor) {
    const quantidade = Math.max(1, Math.min(10, Math.floor(valor / 10)));
    return { quantidade, valor: valor / quantidade };
}

export const CUPONS = {
    BEMVINDO10: { percentual: 10, descricao: "10% na primeira compra" },
    GAMER15: { percentual: 15, descricao: "15% em todo o carrinho" },
};

export const FILTROS_INICIAIS = {
    termo: "",
    generos: [],
    plataformas: [],
    precoMax: null,
    notaMin: 0,
    somentePromocao: false,
    colecao: null,
    ordenar: "relevancia",
};

export const DESCONTO_PIX = 5;


export const LIMITE_COMPARAR = 3;

export function resumirCarrinho(itens, codigoCupom, metodo) {
    const subtotal = itens.reduce((soma, jogo) => soma + jogo.preco, 0);
    const comDesconto = itens.reduce((soma, jogo) => soma + calcularPrecoFinal(jogo), 0);
    const cupom = codigoCupom ? CUPONS[codigoCupom] : null;
    const valorCupom = cupom ? Math.round(comDesconto * cupom.percentual) / 100 : 0;
    const aposCupom = comDesconto - valorCupom;
    const valorPix = metodo === "pix" ? Math.round(aposCupom * DESCONTO_PIX) / 100 : 0;

    return {
        subtotal,
        descontos: subtotal - comDesconto,
        valorCupom,
        valorPix,
        total: aposCupom - valorPix,
    };
}

// A reserva pode ser cancelada (com o valor devolvido) enquanto ainda não foi retirada.
export function podeCancelar(pedido) {
    const { id } = situacaoReserva(pedido);
    return id === "aguardando" || id === "pronto";
}

// Recomenda jogos pelos gêneros mais frequentes entre os que a pessoa viu ou deseja.
export function recomendar(jogos, idsBase, idsExcluir, quantidade = 8) {
    const porId = new Map(jogos.map((jogo) => [jogo.id, jogo]));
    const peso = new Map();
    for (const id of idsBase) for (const genero of porId.get(id)?.generos || []) peso.set(genero, (peso.get(genero) || 0) + 1);
    if (peso.size === 0) return [];
    const excluir = new Set([...idsBase, ...idsExcluir]);

    return jogos
        .filter((jogo) => !excluir.has(jogo.id))
        .map((jogo) => ({ jogo, pontos: jogo.generos.reduce((soma, g) => soma + (peso.get(g) || 0), 0) + jogo.nota / 10 }))
        .filter(({ pontos }) => pontos >= 1)
        .sort((a, b) => b.pontos - a.pontos)
        .slice(0, quantidade)
        .map(({ jogo }) => jogo);
}

export function fimDoMes() {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
}

export function nomeDoMes() {
    const mes = new Date().toLocaleDateString("pt-BR", { month: "long" });
    return mes.charAt(0).toUpperCase() + mes.slice(1);
}

export function normalizar(texto) {
    return texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();
}

export function gerarCodigo(tamanho) {
    const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: tamanho }, () => caracteres[Math.floor(Math.random() * caracteres.length)]).join("");
}

export function baixarArquivo(nome, conteudo) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: "text/plain;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: nome });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
