// Acesso a dados do painel: tudo passa pelo Supabase, e as permissões são conferidas no banco
// (Row Level Security e funções que checam eh_admin()). A tela só mostra o que o banco devolve.
import { BUCKET_IMAGENS, mensagemDeErro, supabase } from "../../servicos/supabase.js";

function resultado({ data, error }) {
    if (error) throw new Error(mensagemDeErro(error));
    return data;
}

// --- Sessão e permissão ---
export const sessaoAtual = async () => resultado(await supabase.auth.getSession()).session;
export const aoMudarSessao = (fn) => supabase.auth.onAuthStateChange(fn).data.subscription;
export const entrar = async (email, senha) => resultado(await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })).session;
export const sair = () => supabase.auth.signOut();
export const ehAdmin = async () => Boolean(resultado(await supabase.rpc("eh_admin")));

// --- Produtos ---
export const listarProdutos = async () => resultado(await supabase.from("produtos").select("*").order("atualizado_em", { ascending: false }));
export const obterProduto = async (id) => resultado(await supabase.from("produtos").select("*").eq("id", id).single());
export async function salvarProduto(dados, id) {
    const consulta = id ? supabase.from("produtos").update(dados).eq("id", id) : supabase.from("produtos").insert(dados);
    return resultado(await consulta.select().single());
}
export const alterarProduto = async (id, campos) => resultado(await supabase.from("produtos").update(campos).eq("id", id).select().single());
export const removerProduto = async (id) => resultado(await supabase.from("produtos").delete().eq("id", id));

// --- Categorias ---
export const listarCategorias = async () => resultado(await supabase.from("categorias").select("*").order("ordem"));
export async function salvarCategoria(dados, idExistente) {
    const consulta = idExistente ? supabase.from("categorias").update(dados).eq("id", idExistente) : supabase.from("categorias").insert(dados);
    return resultado(await consulta.select().single());
}
export const removerCategoria = async (id) => resultado(await supabase.from("categorias").delete().eq("id", id));
export async function reordenarCategorias(ids) {
    const respostas = await Promise.all(ids.map((id, ordem) => supabase.from("categorias").update({ ordem }).eq("id", id)));
    respostas.forEach(resultado);
}

// --- Estoque ---
export const ajustarEstoque = async (id, saldo, motivo) => resultado(await supabase.rpc("admin_ajustar_estoque", { p_produto: id, p_saldo: saldo, p_motivo: motivo }));
export const movimentosDeEstoque = async (id) => resultado(await supabase.from("estoque_movimentos").select("*").eq("produto_id", id).order("criado_em", { ascending: false }).limit(30));

// --- Reservas ---
export const listarReservas = async () => resultado(await supabase.from("reservas").select("*, reserva_itens(*)").order("criado_em", { ascending: false }).limit(500));
// Reservas para os gráficos e relatórios: só as colunas usadas, desde a data pedida (ou todas)
export async function reservasParaRelatorio(desde) {
    let consulta = supabase
        .from("reservas")
        .select("numero, cliente_nome, metodo, status, pagamento, total, criado_em, confirmado_em, retirado_em, cancelado_em, reserva_itens(produto_id, nome, tipo, preco_unitario, quantidade)")
        .order("criado_em", { ascending: false })
        .limit(5000);
    if (desde) consulta = consulta.gte("criado_em", desde.toISOString());
    return resultado(await consulta);
}
export async function contarAguardando() {
    const { count, error } = await supabase.from("reservas").select("numero", { count: "exact", head: true }).eq("status", "aguardando");
    if (error) throw new Error(mensagemDeErro(error));
    return count ?? 0;
}
export const atualizarReserva = async (numero, acao) => resultado(await supabase.rpc("admin_atualizar_reserva", { p_numero: numero, p_acao: acao }));

// --- Histórico ---
export const POR_PAGINA_HISTORICO = 50;
export async function listarHistorico({ pagina = 0, entidade = "" } = {}) {
    let consulta = supabase
        .from("auditoria")
        .select("*", { count: "exact" })
        .order("criado_em", { ascending: false })
        .range(pagina * POR_PAGINA_HISTORICO, pagina * POR_PAGINA_HISTORICO + POR_PAGINA_HISTORICO - 1);
    if (entidade) consulta = consulta.eq("entidade", entidade);
    const { data, error, count } = await consulta;
    if (error) throw new Error(mensagemDeErro(error));
    return { linhas: data, total: count ?? 0 };
}

// --- Imagens (Supabase Storage) ---
export const LIMITE_IMAGEM = 5 * 1024 * 1024;
const EXTENSAO = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Confere o tipo REAL do arquivo pelos primeiros bytes (não pela extensão do nome).
export async function validarImagem(arquivo) {
    if (!arquivo) return { erro: "Nenhum arquivo escolhido." };
    if (arquivo.size > LIMITE_IMAGEM) return { erro: `"${arquivo.name}" tem ${(arquivo.size / 1048576).toFixed(1)} MB: o limite é 5 MB.` };
    const b = new Uint8Array(await arquivo.slice(0, 12).arrayBuffer());
    const ascii = (i, f) => String.fromCharCode(...b.slice(i, f));
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { tipo: "image/jpeg" };
    if (b[0] === 0x89 && ascii(1, 4) === "PNG") return { tipo: "image/png" };
    if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { tipo: "image/webp" };
    return { erro: `"${arquivo.name}" não é JPEG, PNG nem WebP.` };
}

// Envia para produtos/<pasta>/<data>-<aleatório>.<ext> e devolve a URL pública permanente.
export async function enviarImagem(arquivo, tipo, pasta) {
    const caminho = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXTENSAO[tipo]}`;
    // envia com o tipo detectado nos bytes (não o que o nome do arquivo diz)
    const corpo = new Blob([arquivo], { type: tipo });
    resultado(await supabase.storage.from(BUCKET_IMAGENS).upload(caminho, corpo, { contentType: tipo, cacheControl: "31536000", upsert: false }));
    return supabase.storage.from(BUCKET_IMAGENS).getPublicUrl(caminho).data.publicUrl;
}

// Caminho dentro do bucket a partir da URL pública (só imagens enviadas pelo painel; externas ficam como estão).
export function caminhoNoBucket(url) {
    const achado = String(url || "").match(new RegExp(`/storage/v1/object/public/${BUCKET_IMAGENS}/(.+)$`));
    return achado ? decodeURIComponent(achado[1]) : null;
}

// Apaga do Storage as imagens que nenhum produto usa mais (nunca apaga imagem externa ou ainda em uso).
export async function apagarImagensOrfas(urls) {
    for (const url of new Set(urls.filter(Boolean))) {
        const caminho = caminhoNoBucket(url);
        if (!caminho) continue;
        const emUso = resultado(await supabase.rpc("imagem_em_uso", { p_url: url, p_ignorar_produto: null }));
        if (!emUso) await supabase.storage.from(BUCKET_IMAGENS).remove([caminho]);
    }
}

// --- Regras de preço (iguais às do banco, para mostrar a prévia antes de salvar) ---
export function promocaoVigente(p, agora = Date.now()) {
    return Boolean(
        p.promocao_ativa &&
            p.preco_promocional != null &&
            (!p.promocao_inicio || new Date(p.promocao_inicio).getTime() <= agora) &&
            (!p.promocao_fim || new Date(p.promocao_fim).getTime() > agora),
    );
}

export function situacaoPromocao(p, agora = Date.now()) {
    if (!p.promocao_ativa || p.preco_promocional == null) return "sem";
    if (promocaoVigente(p, agora)) return "vigente";
    if (p.promocao_inicio && new Date(p.promocao_inicio).getTime() > agora) return "agendada";
    return "encerrada";
}

export const precoAtual = (p) => Number(promocaoVigente(p) ? p.preco_promocional : p.preco);
export const percentualDesconto = (preco, promocional) => (preco > 0 && promocional != null && promocional < preco ? Math.round((1 - promocional / preco) * 100) : 0);

// Produto sem nenhuma imagem própria nem da Steam
export const semImagem = (p) => (p.tipo === "jogo" ? !p.app_id && !p.imagem_principal && !p.imagem_capa : !p.imagem_principal);

export const estoqueBaixo = (p) => p.controla_estoque && p.estoque != null && p.estoque > 0 && p.estoque <= p.estoque_minimo;
export const esgotado = (p) => p.controla_estoque && (p.estoque ?? 0) === 0;
