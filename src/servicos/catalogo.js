// Catálogo da loja vindo do banco (Supabase): a mesma fonte que o painel administrativo edita.
// Sem servidor configurado, a loja usa os arquivos locais (src/dados/jogos.js e src/dados/produtos.js).
// O último catálogo recebido fica guardado no navegador para a loja abrir na hora na próxima visita.

const CHAVE_CACHE = "ug:catalogo";
export const SEM_IMAGEM = `${import.meta.env.BASE_URL}sem-imagem.svg`;
const temServidor = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
export const catalogoNoServidor = temServidor;

const ehUrl = (v) => typeof v === "string" && /^(https?:)?\/\//.test(v);
const numero = (v) => (v == null ? null : Number(v));

// desconto exibido no selo: arredondado a partir do preço do momento calculado no banco
function precos(linha) {
    const preco = numero(linha.preco);
    const final = numero(linha.preco_atual ?? linha.preco);
    const desconto = linha.em_promocao && preco > 0 ? Math.round((1 - final / preco) * 100) : 0;
    return { preco, precoFinal: final, desconto };
}

// Linha da tabela produtos (ou da vitrine) → objeto de jogo no formato usado pela loja.
export function paraJogo(linha) {
    const principal = ehUrl(linha.imagem_principal) ? linha.imagem_principal : null;
    const capa = ehUrl(linha.imagem_capa) ? linha.imagem_capa : null;
    const imagens = { ...(linha.imagens || {}) };
    if (principal) Object.assign(imagens, { horizontal: principal, destaque: principal, linha: principal });
    if (capa) Object.assign(imagens, { capa, capaPequena: capa });
    // jogo sem imagens da Steam (cadastrado pelo painel): tudo sai da imagem enviada ou do placeholder
    if (!linha.app_id) {
        const base = principal || capa || SEM_IMAGEM;
        Object.assign(imagens, { horizontal: principal || base, destaque: principal || base, linha: principal || base, capa: capa || base, capaPequena: capa || base, banner: principal || base });
    }
    return {
        id: Number(linha.id),
        slug: linha.slug,
        appId: linha.app_id ? Number(linha.app_id) : null,
        trailer: linha.trailer || undefined,
        capturas: linha.capturas || [],
        galeria: (linha.galeria || []).filter(ehUrl),
        fundo: linha.fundo || undefined,
        nome: linha.nome,
        desenvolvedora: linha.desenvolvedora || "",
        lancamento: linha.lancamento || new Date(linha.criado_em || Date.now()).getFullYear(),
        plataformas: linha.plataformas || [],
        generos: linha.generos?.length ? linha.generos : ["Jogo"],
        nota: numero(linha.nota) ?? 0,
        ...precos(linha),
        destaque: Boolean(linha.destaque),
        descricao: linha.descricao || linha.descricao_curta || "",
        imagens,
    };
}

// Linha → produto físico (acessório, celular, console...) no formato usado pela loja.
export function paraProduto(linha, nomeDaCategoria) {
    return {
        id: Number(linha.id),
        slug: linha.slug,
        tipo: "acessorio",
        nome: linha.nome,
        categoria: linha.categoria_id,
        // URL enviada pelo painel ou o nome de uma ilustração de public/acessorios
        ilustracao: linha.imagem_principal || null,
        galeria: (linha.galeria || []).filter(ehUrl),
        ...precos(linha),
        nota: numero(linha.nota) ?? 0,
        avaliacoes: linha.avaliacoes ?? 0,
        marca: linha.marca || "",
        modelo: linha.modelo || "",
        compatibilidade: linha.compatibilidade || [],
        especificacoes: linha.especificacoes || [],
        variacoes: linha.variacoes || [],
        descricao: linha.descricao || linha.descricao_curta || "",
        esgotado: Boolean(linha.esgotado),
        estoque: linha.controla_estoque ? linha.estoque : null,
        desenvolvedora: linha.marca || "",
        generos: ["Produto", nomeDaCategoria(linha.categoria_id)],
    };
}

export function catalogoGuardado() {
    if (!temServidor) return null;
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE_CACHE));
        return salvo?.jogos?.length ? salvo : null;
    } catch {
        return null;
    }
}

// Busca no banco o catálogo público (produtos ativos com o preço do momento) e as categorias.
export async function carregarCatalogo() {
    if (!temServidor) return null;
    const { supabase } = await import("./supabase.js");
    const [produtos, categorias] = await Promise.all([
        supabase.from("vitrine").select("*").order("id"),
        supabase.from("categorias").select("id, nome, descricao, tipo, ordem").order("ordem"),
    ]);
    if (produtos.error) throw produtos.error;
    if (categorias.error) throw categorias.error;
    const departamentos = categorias.data.filter((c) => c.tipo === "produto").map(({ id, nome, descricao }) => ({ id, nome, descricao }));
    const nome = (id) => departamentos.find((c) => c.id === id)?.nome ?? id;
    const dados = {
        categorias: departamentos,
        jogos: produtos.data.filter((l) => l.tipo === "jogo").map(paraJogo),
        acessorios: produtos.data.filter((l) => l.tipo === "acessorio").map((l) => paraProduto(l, nome)),
        salvoEm: Date.now(),
    };
    try {
        localStorage.setItem(CHAVE_CACHE, JSON.stringify(dados));
    } catch {
        // navegador sem espaço ou em modo privado: segue sem guardar
    }
    return dados;
}
