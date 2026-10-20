// Abas da página inicial (ex.: Clássicos de cada console): lista de jogos com prévia do que está em foco.
import { useState } from "react";
import { useIndicador } from "../../utilidades/hooks.js";
import { useLoja } from "../../utilidades/LojaContext.js";
import { capturasDoJogo, imagensDoJogo } from "../../utilidades/funcoes.js";
import { Avaliacao, Imagem, Plataformas, Preco } from "../comum/CardJogo.jsx";
import { CabecalhoSecao } from "./Secoes.jsx";
import { IconeCoracao } from "../comum/Icones.jsx";

// Linha de jogo usada nas abas da loja.
export function LinhaJogo({ jogo, aoPassar, ativa = false, compacta = false }) {
    const { abrirJogo, estaNosDesejos } = useLoja();
    const imagens = imagensDoJogo(jogo);

    return (
        <button
            type="button"
            className={`linha ${ativa ? "ativa" : ""} ${compacta ? "compacta" : ""}`}
            onClick={() => abrirJogo(jogo.id)}
            onMouseEnter={aoPassar}
            onFocus={aoPassar}
        >
            <span className="linha-imagem">
                <Imagem src={imagens.horizontal} alt="" />
            </span>
            <span className="linha-info">
                <span className="linha-nome">
                    {jogo.nome}
                    {estaNosDesejos(jogo.id) && <IconeCoracao tamanho={12} preenchido className="linha-desejo" />}
                </span>
                <span className="linha-meta">
                    <Plataformas lista={jogo.plataformas} />
                    <span className="linha-generos">{jogo.generos.join(" · ")}</span>
                </span>
            </span>
            {compacta && (
                <>
                    <span className="linha-ano">{jogo.lancamento}</span>
                    <span className="linha-avaliacao">
                        <Avaliacao nota={jogo.nota} compacta />
                    </span>
                </>
            )}
            <Preco jogo={jogo} />
        </button>
    );
}

function Previa({ jogo }) {
    return (
        <aside className="previa" aria-live="polite">
            <div key={jogo.id} className="previa-conteudo">
                <h3>{jogo.nome}</h3>
                <Avaliacao nota={jogo.nota} />
                <div className="tags">
                    {jogo.generos.map((genero) => (
                        <span key={genero} className="tag">
                            {genero}
                        </span>
                    ))}
                </div>
                {capturasDoJogo(jogo)
                    .slice(0, 3)
                    .map((captura) => (
                        <Imagem key={captura.mini} src={captura.mini} alt="" className="previa-captura" />
                    ))}
            </div>
        </aside>
    );
}

// Seção com abas de jogos; com título vira uma seção própria (ex.: clássicos de cada console).
function Abas({ abas, aoVerMais, id = "abas", titulo, descricao }) {
    const segmentosRef = useIndicador();
    const [abaAtual, setAbaAtual] = useState(0);
    const lista = abas[abaAtual].jogos;
    const [emFoco, setEmFoco] = useState(lista[0]);
    const exibido = lista.includes(emFoco) ? emFoco : lista[0];

    return (
        <section className="secao" id={id}>
            {titulo && <CabecalhoSecao titulo={titulo} descricao={descricao} />}
            <div className="secao-topo">
                <div className="segmentos" role="tablist" ref={segmentosRef}>
                    {abas.map((aba, indice) => (
                        <button
                            type="button"
                            key={aba.titulo}
                            role="tab"
                            aria-selected={indice === abaAtual}
                            className={indice === abaAtual ? "segmento ativo" : "segmento"}
                            onClick={() => setAbaAtual(indice)}
                        >
                            {aba.titulo}
                        </button>
                    ))}
                </div>
                <button type="button" className="link-mais" onClick={() => aoVerMais(abas[abaAtual])}>
                    Ver tudo
                </button>
            </div>
            <div className="abas-corpo">
                <div className="abas-lista" role="tabpanel">
                    {lista.map((jogo) => (
                        <LinhaJogo key={jogo.id} jogo={jogo} ativa={jogo === exibido} aoPassar={() => setEmFoco(jogo)} />
                    ))}
                </div>
                {exibido && <Previa jogo={exibido} />}
            </div>
        </section>
    );
}

export default Abas;
