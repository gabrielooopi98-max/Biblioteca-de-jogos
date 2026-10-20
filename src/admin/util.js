// Funções e dados compartilhados pelas telas do painel (sem componentes).
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { SEM_IMAGEM } from "../catalogo.js";
import { formatarPreco } from "../utils.js";

// --- Contexto do painel (produtos, categorias, avisos e recarga) ---
export const ContextoAdmin = createContext(null);
export const useAdmin = () => useContext(ContextoAdmin);

export function useAvisos() {
    const [avisos, setAvisos] = useState([]);
    const proximo = useRef(0);
    const remover = useCallback((id) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);
    const avisar = useCallback(
        (texto, tom = "ok") => {
            const id = ++proximo.current;
            setAvisos((lista) => [...lista.slice(-3), { id, texto, tom }]);
            setTimeout(() => remover(id), tom === "erro" ? 7000 : 4000);
        },
        [remover],
    );
    return { avisos, avisar, remover };
}

// --- Datas ---
export const dataHora = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
export const dataCurta = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—");
export const FUSO = Intl.DateTimeFormat().resolvedOptions().timeZone;

// ISO (banco) ⇄ valor do <input type="datetime-local"> no horário do computador
export function paraCampoData(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const dois = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`;
}
export const deCampoData = (valor) => (valor ? new Date(valor).toISOString() : null);

// --- Produtos ---
export const STATUS_PRODUTO = {
    ativo: { rotulo: "Publicado", tom: "ok" },
    inativo: { rotulo: "Inativo", tom: "neutro" },
    rascunho: { rotulo: "Rascunho", tom: "aviso" },
    arquivado: { rotulo: "Arquivado", tom: "apagado" },
};

export function paraSlug(texto) {
    return texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70)
        .replace(/-+$/, "");
}

const CDN_STEAM = "https://cdn.cloudflare.steamstatic.com/steam/apps";
const ehUrl = (v) => /^(https?:)?\/\//.test(v || "");

// Miniatura: imagem enviada, ilustração antiga, imagem da Steam ou o placeholder
export function miniatura(p) {
    if (ehUrl(p.imagem_principal)) return p.imagem_principal;
    if (ehUrl(p.imagem_capa)) return p.imagem_capa;
    if (p.tipo === "acessorio" && p.imagem_principal) return `${import.meta.env.BASE_URL}${/\.[a-z0-9]+$/i.test(p.imagem_principal) ? p.imagem_principal : `acessorios/${p.imagem_principal}.svg`}`;
    if (p.imagens?.horizontal) return p.imagens.horizontal;
    if (p.app_id) return `${CDN_STEAM}/${p.app_id}/capsule_231x87.jpg`;
    return SEM_IMAGEM;
}

// número digitado com vírgula ou ponto ("229,99", "1.299,90" ou "229.99")
export function lerPreco(texto) {
    if (texto === "" || texto == null) return null;
    const n = Number(String(texto).replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

// Erros da promoção (vazio = tudo certo). As mesmas regras são conferidas no banco.
export function errosPromocao({ preco, promocao_ativa, preco_promocional, promocao_inicio, promocao_fim }) {
    const erros = {};
    const original = lerPreco(preco);
    const promocional = lerPreco(preco_promocional);
    if (promocao_ativa) {
        if (promocional == null) erros.preco_promocional = "Informe o preço promocional.";
        else if (Number.isNaN(promocional) || promocional < 0) erros.preco_promocional = "Preço promocional inválido.";
        else if (original != null && promocional >= original) erros.preco_promocional = "Precisa ser menor que o preço original.";
    }
    if (promocao_inicio && promocao_fim && new Date(promocao_fim) <= new Date(promocao_inicio)) erros.promocao_fim = "O fim precisa ser depois do início.";
    return erros;
}

// --- Histórico ---
export const ROTULOS_ACAO = {
    produto_criado: "Produto cadastrado",
    produto_editado: "Produto editado",
    produto_removido: "Produto apagado",
    produto_arquivado: "Produto arquivado",
    status_alterado: "Publicação alterada",
    preco_alterado: "Preço alterado",
    promocao_criada: "Promoção criada",
    promocao_alterada: "Promoção alterada",
    promocao_encerrada: "Promoção encerrada",
    imagem_alterada: "Imagem alterada",
    estoque_alterado: "Estoque alterado",
    categoria_criada: "Categoria criada",
    categoria_editada: "Categoria editada",
    categoria_removida: "Categoria removida",
    pagamento_confirmado: "Pagamento confirmado",
    reserva_separada: "Reserva separada",
    reserva_retirada: "Reserva retirada",
    reserva_cancelada: "Reserva cancelada pela loja",
    reserva_cancelada_pelo_cliente: "Reserva cancelada pelo cliente",
};

const NOME_STATUS = { ativo: "publicado", inativo: "inativo", rascunho: "rascunho", arquivado: "arquivado" };
const valor = (v) => (v == null ? "—" : formatarPreco(Number(v)));

// Frase curta com o que mudou, a partir dos detalhes guardados pelo banco
export function resumoDetalhes(a) {
    const d = a.detalhes || {};
    const quem = d.nome || (a.entidade === "reserva" ? `Reserva ${a.entidade_id}` : `#${a.entidade_id}`);
    switch (a.acao) {
        case "preco_alterado":
            return `${quem}: ${valor(d.de)} → ${valor(d.para)}`;
        case "promocao_criada":
        case "promocao_alterada":
            return `${quem}: ${valor(d.preco)} → ${valor(d.preco_promocional)}${d.fim ? ` até ${dataHora(d.fim)}` : ""}`;
        case "estoque_alterado":
            return `${quem}: ${d.de ?? "sem controle"} → ${d.para ?? "sem controle"}`;
        case "status_alterado":
        case "produto_arquivado":
            return `${quem}: ${NOME_STATUS[d.de] || d.de} → ${NOME_STATUS[d.para] || d.para}`;
        case "produto_editado":
            return `${quem}: ${(d.campos || []).join(", ")}`;
        case "pagamento_confirmado":
        case "reserva_retirada":
        case "reserva_cancelada":
        case "reserva_separada":
            return `${quem}${d.total != null ? ` · ${valor(d.total)}` : ""}`;
        default:
            return quem;
    }
}
