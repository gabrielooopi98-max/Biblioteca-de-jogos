import { useState } from "react";
import { useLoja } from "../LojaContext.js";
import { calcularPrecoFinal, formatarPreco, imagensDoJogo, resumoAvaliacoes } from "../utils.js";
import { IconeCarrinho, IconeCheck, IconeComparar, IconeCoracao } from "./Icones.jsx";
import { usePreviaTrailer } from "../hooks.js";
import Trailer from "./Trailer.jsx";

// srcSet/sizes vêm antes do src (senão o navegador pode baixar as duas versões).
// Se a imagem falhar, cai na alternativa e abandona o srcSet, que também apontaria para a quebrada.
const SEM_IMAGEM = `${import.meta.env.BASE_URL}sem-imagem.svg`;

// Imagem com reserva: se a original falhar, tenta a alternativa e, por último, o placeholder (nunca fica quebrada).
export function Imagem({ src, srcSet, sizes, alt = "", className = "", alternativa, ...props }) {
    const [carregou, setCarregou] = useState(false);
    const [origem, setOrigem] = useState(src || alternativa || SEM_IMAGEM);
    const [anterior, setAnterior] = useState(src);
    if (src !== anterior) {
        setAnterior(src);
        setOrigem(src || alternativa || SEM_IMAGEM);
    }
    const usandoAlternativa = origem !== src;

    return (
        <img
            srcSet={usandoAlternativa ? undefined : srcSet}
            sizes={usandoAlternativa ? undefined : sizes}
            src={origem}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={`${className} imagem ${carregou ? "carregada" : ""}`}
            onLoad={() => setCarregou(true)}
            onError={() => {
                if (alternativa && origem !== alternativa && origem !== SEM_IMAGEM) setOrigem(alternativa);
                else if (origem !== SEM_IMAGEM) setOrigem(SEM_IMAGEM);
            }}
            {...props}
        />
    );
}

export function Preco({ jogo, tamanho = "medio" }) {
    const final = calcularPrecoFinal(jogo);

    return (
        <span className={`preco preco-${tamanho}`}>
            {jogo.desconto > 0 && <span className="preco-desconto">-{jogo.desconto}%</span>}
            {jogo.desconto > 0 && <s>{formatarPreco(jogo.preco)}</s>}
            <span className="preco-final">{formatarPreco(final)}</span>
        </span>
    );
}

export function Avaliacao({ nota, compacta = false }) {
    return (
        <span className="avaliacao" title={`Nota ${nota.toFixed(1)} de 10`}>
            <span className="avaliacao-barra" aria-hidden="true">
                <span style={{ width: `${nota * 10}%` }} />
            </span>
            <span className="avaliacao-nota">{nota.toFixed(1)}</span>
            {!compacta && <span className="avaliacao-texto">{resumoAvaliacoes(nota)}</span>}
        </span>
    );
}

// A loja só vende jogos de console: PlayStation (PS2 a PS5) e Xbox (360 e Series X/S).
const FAMILIAS = [
    ["PlayStation", (p) => p.startsWith("PS")],
    ["Xbox", (p) => p.startsWith("Xbox")],
];

export function Plataformas({ lista }) {
    return (
        <span className="plataformas" aria-label={`Plataformas: ${lista.join(", ")}`}>
            {FAMILIAS.filter(([, pertence]) => lista.some(pertence)).map(([nome, pertence]) => (
                <span key={nome} className="plataforma" title={lista.filter(pertence).join(", ")}>
                    {nome}
                </span>
            ))}
        </span>
    );
}

export function AcoesRapidas({ jogo }) {
    const { alternarDesejo, estaNosDesejos, alternarComparar, estaComparando } = useLoja();
    const desejado = estaNosDesejos(jogo.id);
    const comparando = estaComparando(jogo.id);

    return (
        <span className="acoes-rapidas">
            <button
                type="button"
                className={desejado ? "acao-rapida ativa" : "acao-rapida"}
                onClick={() => alternarDesejo(jogo)}
                aria-pressed={desejado}
                data-dica={desejado ? "Remover dos desejos" : "Desejar"}
                aria-label={desejado ? `Remover ${jogo.nome} da lista de desejos` : `Adicionar ${jogo.nome} à lista de desejos`}
            >
                <IconeCoracao tamanho={15} preenchido={desejado} />
            </button>
            <button
                type="button"
                className={comparando ? "acao-rapida ativa" : "acao-rapida"}
                onClick={() => alternarComparar(jogo)}
                aria-pressed={comparando}
                data-dica={comparando ? "Remover da comparação" : "Comparar"}
                aria-label={comparando ? `Remover ${jogo.nome} da comparação` : `Comparar ${jogo.nome}`}
            >
                <IconeComparar tamanho={15} />
            </button>
        </span>
    );
}

function CardJogo({ jogo }) {
    const { abrirJogo, adicionarAoCarrinho, estaNoCarrinho } = useLoja();
    const imagens = imagensDoJogo(jogo);
    const noCarrinho = estaNoCarrinho(jogo.id);
    const [previa, eventosPrevia] = usePreviaTrailer();

    return (
        <article className="cartao" {...eventosPrevia}>
            <button type="button" className="cartao-imagem" onClick={() => abrirJogo(jogo.id)} aria-label={`Ver ${jogo.nome}`}>
                <Imagem src={imagens.horizontal} alt={jogo.nome} />
                {previa && <Trailer jogo={jogo} className="cartao-trailer" />}
                {jogo.lancamento >= 2024 && <span className="selo">Novo</span>}
            </button>
            <AcoesRapidas jogo={jogo} />

            <div className="cartao-corpo">
                <button type="button" className="cartao-nome" onClick={() => abrirJogo(jogo.id)} title={jogo.nome}>
                    {jogo.nome}
                </button>
                <span className="cartao-meta">
                    {jogo.generos[0]} · {jogo.lancamento}
                </span>
                <div className="cartao-rodape">
                    <Preco jogo={jogo} />
                    <button
                        type="button"
                        className={noCarrinho ? "cartao-carrinho ativo" : "cartao-carrinho"}
                        onClick={() => adicionarAoCarrinho(jogo)}
                        aria-label={noCarrinho ? `${jogo.nome} já está no carrinho` : `Adicionar ${jogo.nome} ao carrinho`}
                        data-dica={noCarrinho ? "No carrinho" : "Adicionar"}
                    >
                        {noCarrinho ? <IconeCheck tamanho={15} /> : <IconeCarrinho tamanho={15} />}
                    </button>
                </div>
            </div>
        </article>
    );
}

export default CardJogo;
