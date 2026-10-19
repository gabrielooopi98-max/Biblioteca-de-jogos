const CDN_STEAM = "https://cdn.cloudflare.steamstatic.com/steam/apps";
const CDN_CAPTURAS = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps";

export const ehAcessorio = (item) => item?.tipo === "acessorio";

// Entrega dos acessórios (produtos físicos).
export const FRETE = { gratisAPartirDe: 199, valor: 19.9, prazoMin: 3, prazoMax: 7 };
export const PRAZO_ENTREGA = `${FRETE.prazoMin} a ${FRETE.prazoMax} dias úteis`;
export const GARANTIA_MESES = 12;

// Soma dias úteis (sem sábado e domingo) a uma data.
export function somarDiasUteis(data, dias) {
    const d = new Date(data);
    let faltam = dias;
    while (faltam > 0) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) faltam--;
    }
    return d;
}

// Cada imagem no tamanho em que aparece: capa 600x900 só onde é grande, 300x450 nas miniaturas.
// jogo.imagens sobrescreve endereços que a Steam não publica no CDN antigo.
// Acessórios usam a ilustração própria (ou uma foto, se "ilustracao" for um caminho com extensão).
export function imagensDoJogo(jogo) {
    if (ehAcessorio(jogo)) {
        const arquivo = /\.[a-z0-9]+$/i.test(jogo.ilustracao) ? jogo.ilustracao : `acessorios/${jogo.ilustracao}.svg`;
        const arte = `${import.meta.env.BASE_URL}${arquivo}`;
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

export function calcularPrecoFinal(jogo) {
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
    ocultarPossuidos: false,
    colecao: null,
    ordenar: "relevancia",
};

export const DESCONTO_PIX = 5;

// Direito de arrependimento em compras online (CDC, art. 49).
export const DIAS_REEMBOLSO = 7;

export const LIMITE_COMPARAR = 3;

export function resumirCarrinho(itens, codigoCupom, metodo) {
    const subtotal = itens.reduce((soma, jogo) => soma + jogo.preco, 0);
    const comDesconto = itens.reduce((soma, jogo) => soma + calcularPrecoFinal(jogo), 0);
    const cupom = codigoCupom ? CUPONS[codigoCupom] : null;
    const valorCupom = cupom ? Math.round(comDesconto * cupom.percentual) / 100 : 0;
    const aposCupom = comDesconto - valorCupom;
    const valorPix = metodo === "pix" ? Math.round(aposCupom * DESCONTO_PIX) / 100 : 0;
    // frete só existe com acessório no carrinho; grátis a partir do valor mínimo em acessórios
    const fisicos = itens.filter(ehAcessorio);
    const valorFisicos = fisicos.reduce((soma, item) => soma + calcularPrecoFinal(item), 0);
    const temFisicos = fisicos.length > 0;
    const frete = !temFisicos || valorFisicos >= FRETE.gratisAPartirDe ? 0 : FRETE.valor;
    const faltaParaFreteGratis = temFisicos && frete > 0 ? FRETE.gratisAPartirDe - valorFisicos : 0;

    return {
        subtotal,
        descontos: subtotal - comDesconto,
        valorCupom,
        valorPix,
        temFisicos,
        frete,
        faltaParaFreteGratis,
        total: aposCupom - valorPix + frete,
    };
}

export function prazoReembolso(pedido) {
    const limite = new Date(pedido.data).getTime() + DIAS_REEMBOLSO * 86400000;
    return { limite, dentro: pedido.status === "pago" && Date.now() < limite };
}

// Recomenda jogos pelos gêneros mais frequentes entre os que a pessoa viu, deseja ou possui.
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

export function gerarChave() {
    return `${gerarCodigo(5)}-${gerarCodigo(5)}-${gerarCodigo(5)}`;
}

export function baixarArquivo(nome, conteudo) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: "text/plain;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: nome });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
