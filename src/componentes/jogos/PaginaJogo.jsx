// Página de um jogo: galeria (trailer e capturas), descrição, ficha técnica, caixa de compra e jogos parecidos.
import { useEffect, useRef, useState } from "react";
import { navegar } from "../../utilidades/hooks.js";
import { capturasDoJogo, DIAS_PARA_RETIRAR, imagensDoJogo, resumoAvaliacoes, trailerDoJogo } from "../../utilidades/funcoes.js";
import CaixaCompra from "../produtos/CaixaCompra.jsx";
import CardJogo, { Imagem } from "../comum/CardJogo.jsx";
import { IconePlay, IconeSetaDireita, IconeSetaEsquerda } from "../comum/Icones.jsx";
import Trailer from "../comum/Trailer.jsx";

function jogosSemelhantes(jogo, todos) {
    return todos
        .filter((outro) => outro.id !== jogo.id)
        .map((outro) => ({
            outro,
            pontos: outro.generos.filter((g) => jogo.generos.includes(g)).length * 2 + (outro.desenvolvedora === jogo.desenvolvedora ? 3 : 0) + outro.nota / 10,
        }))
        .sort((a, b) => b.pontos - a.pontos)
        .slice(0, 5)
        .map(({ outro }) => outro);
}

// Trailer primeiro (como na Steam), depois as capturas.
function Galeria({ jogo }) {
    const capturas = capturasDoJogo(jogo);
    const trailer = trailerDoJogo(jogo);
    const itens = [...(trailer ? [{ tipo: "trailer", mini: trailer.capa }] : []), ...capturas.map((c) => ({ tipo: "captura", ...c }))];
    const [indice, setIndice] = useState(0);
    const tiraRef = useRef(null);

    useEffect(() => {
        tiraRef.current?.children[indice]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }, [indice]);

    if (itens.length === 0) return <Imagem src={imagensDoJogo(jogo).banner} alt="" className="galeria-unica" />;

    const ir = (i) => setIndice((i + itens.length) % itens.length);
    const item = itens[indice];
    const numeroCaptura = indice - (trailer ? 1 : 0) + 1;

    return (
        <div className="galeria">
            <div className="galeria-palco">
                {item.tipo === "trailer" ? (
                    <Trailer jogo={jogo} controles className="galeria-video" aoTerminar={() => ir(indice + 1)} />
                ) : (
                    <img key={item.grande} src={item.grande} alt={`Captura ${numeroCaptura} de ${jogo.nome}`} />
                )}
                <button type="button" className="galeria-seta esquerda" onClick={() => ir(indice - 1)} aria-label="Anterior">
                    <IconeSetaEsquerda tamanho={22} />
                </button>
                <button type="button" className="galeria-seta direita" onClick={() => ir(indice + 1)} aria-label="Próximo">
                    <IconeSetaDireita tamanho={22} />
                </button>
                <span className="galeria-contagem">{item.tipo === "trailer" ? "Trailer" : `${numeroCaptura} / ${capturas.length}`}</span>
            </div>
            <div className="galeria-tira" ref={tiraRef}>
                {itens.map((miniatura, i) => (
                    <button
                        type="button"
                        key={miniatura.mini}
                        className={[i === indice ? "ativa" : "", miniatura.tipo === "trailer" ? "galeria-mini-trailer" : ""].join(" ").trim()}
                        onClick={() => setIndice(i)}
                        aria-label={miniatura.tipo === "trailer" ? "Ver trailer" : `Ver captura ${i - (trailer ? 1 : 0) + 1}`}
                    >
                        <Imagem src={miniatura.mini} alt="" />
                        {miniatura.tipo === "trailer" && (
                            <span className="galeria-play" aria-hidden="true">
                                <IconePlay tamanho={14} />
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

function PaginaJogo({ jogo, jogos, comprarAgora, aoEscolherGenero }) {
    if (!jogo) {
        return (
            <div className="pagina vazio">
                <h3>Jogo não encontrado</h3>
                <button type="button" className="botao botao-secundario" onClick={() => navegar("/explorar")}>
                    Ir para o catálogo
                </button>
            </div>
        );
    }

    const imagens = imagensDoJogo(jogo);
    const ficha = [
        ["Desenvolvedora", jogo.desenvolvedora],
        ["Lançamento", jogo.lancamento],
        ["Plataformas", jogo.plataformas.join(", ")],
        ["Gêneros", jogo.generos.join(", ")],
        ["Mídia", "Física (disco original lacrado)"],
        ["Retirada", `Na loja, em até ${DIAS_PARA_RETIRAR} dias após a confirmação`],
    ];

    return (
        <div className="pagina pagina-jogo" style={jogo.fundo ? { "--fundo-jogo": `url("${jogo.fundo}")` } : undefined}>
            <nav className="trilha" aria-label="Você está em">
                <a href="#/explorar">Jogos</a>
                <span>/</span>
                <button type="button" onClick={() => aoEscolherGenero(jogo.generos[0])}>
                    {jogo.generos[0]}
                </button>
                <span>/</span>
                <span aria-current="page">{jogo.nome}</span>
            </nav>

            <header className="jogo-cabecalho">
                <h1>{jogo.nome}</h1>
                <div className="jogo-meta">
                    <span className="jogo-nota" title={`Nota ${jogo.nota.toFixed(1)} de 10`}>
                        <strong>{jogo.nota.toFixed(1)}</strong> {resumoAvaliacoes(jogo.nota)}
                    </span>
                    <span>{jogo.desenvolvedora}</span>
                    <span>{jogo.lancamento}</span>
                    <span className="jogo-meta-plataformas">
                        {jogo.plataformas.map((p) => (
                            <span key={p} className="caixa-plataforma">
                                {p}
                            </span>
                        ))}
                    </span>
                </div>
            </header>

            <div className="jogo-layout">
                <div className="jogo-principal">
                    <Galeria key={jogo.id} jogo={jogo} />

                    <div className="jogo-informacoes">
                        <section className="jogo-bloco">
                            <h2 className="titulo-secao">Sobre o jogo</h2>
                            <p className="jogo-sobre">{jogo.descricao}</p>
                            <div className="tags">
                                {jogo.generos.map((genero) => (
                                    <button type="button" key={genero} className="tag" onClick={() => aoEscolherGenero(genero)}>
                                        {genero}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="jogo-bloco">
                            <h2 className="titulo-secao">Ficha técnica</h2>
                            <dl className="ficha-lista">
                                {ficha.map(([rotulo, valor]) => (
                                    <div key={rotulo}>
                                        <dt>{rotulo}</dt>
                                        <dd>{valor}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    </div>
                </div>

                <aside className="compra">
                    <CaixaCompra item={jogo} comprarAgora={comprarAgora} plataformas={jogo.plataformas}>
                        <Imagem src={imagens.horizontal} alt="" className="compra-capa" key={imagens.horizontal} />
                    </CaixaCompra>
                </aside>
            </div>

            <section className="secao">
                <h2 className="titulo-secao">Você também pode gostar</h2>
                <div className="grade grade-relacionados">
                    {jogosSemelhantes(jogo, jogos).map((outro) => (
                        <CardJogo key={outro.id} jogo={outro} />
                    ))}
                </div>
            </section>
        </div>
    );
}

export default PaginaJogo;
