import { useEffect, useRef, useState } from "react";
import { navegar } from "../hooks.js";
import { useLoja } from "../LojaContext.js";
import { calcularParcelas, calcularPrecoFinal, capturasDoJogo, DESCONTO_PIX, DIAS_REEMBOLSO, formatarPreco, imagensDoJogo, trailerDoJogo } from "../utils.js";
import CardJogo, { Avaliacao, Imagem, Plataformas, Preco } from "./CardJogo.jsx";
import {
    IconeBiblioteca,
    IconeCarrinho,
    IconeCheck,
    IconeComparar,
    IconeCoracao,
    IconeDesfazer,
    IconeEscudo,
    IconePlay,
    IconePresente,
    IconeRaio,
    IconeSetaDireita,
    IconeSetaEsquerda,
} from "./Icones.jsx";
import Trailer from "./Trailer.jsx";

function jogosSemelhantes(jogo, todos) {
    return todos
        .filter((outro) => outro.id !== jogo.id)
        .map((outro) => ({
            outro,
            pontos: outro.generos.filter((g) => jogo.generos.includes(g)).length * 2 + (outro.desenvolvedora === jogo.desenvolvedora ? 3 : 0) + outro.nota / 10,
        }))
        .sort((a, b) => b.pontos - a.pontos)
        .slice(0, 4)
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

function PaginaJogo({ jogo, jogos, comprarAgora, presentear, aoEscolherGenero }) {
    const { adicionarAoCarrinho, alternarDesejo, estaNoCarrinho, estaNosDesejos, alternarComparar, estaComparando, possui } = useLoja();

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
    const final = calcularPrecoFinal(jogo);
    const parcelas = calcularParcelas(final);
    const noCarrinho = estaNoCarrinho(jogo.id);
    const desejado = estaNosDesejos(jogo.id);
    const comparando = estaComparando(jogo.id);
    const jaPossui = possui(jogo.id);

    return (
        <div className="pagina pagina-jogo" style={jogo.fundo ? { "--fundo-jogo": `url("${jogo.fundo}")` } : undefined}>
            <nav className="trilha" aria-label="Você está em">
                <a href="#/explorar">Explorar</a>
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
                    <Avaliacao nota={jogo.nota} />
                    <span>{jogo.desenvolvedora}</span>
                    <span>{jogo.lancamento}</span>
                    <Plataformas lista={jogo.plataformas} />
                </div>
            </header>

            <div className="jogo-layout">
                <div className="jogo-principal">
                    <Galeria key={jogo.id} jogo={jogo} />

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
                        <h2 className="titulo-secao">Detalhes</h2>
                        <dl className="ficha">
                            <div>
                                <dt>Desenvolvedora</dt>
                                <dd>{jogo.desenvolvedora}</dd>
                            </div>
                            <div>
                                <dt>Lançamento</dt>
                                <dd>{jogo.lancamento}</dd>
                            </div>
                            <div>
                                <dt>Plataformas</dt>
                                <dd>{jogo.plataformas.join(", ")}</dd>
                            </div>
                            <div>
                                <dt>Gêneros</dt>
                                <dd>{jogo.generos.join(", ")}</dd>
                            </div>
                            <div>
                                <dt>Nota</dt>
                                <dd>
                                    <Avaliacao nota={jogo.nota} />
                                </dd>
                            </div>
                            <div>
                                <dt>Entrega</dt>
                                <dd>Chave digital por e-mail e na sua biblioteca</dd>
                            </div>
                        </dl>
                    </section>
                </div>

                <aside className="compra">
                    <Imagem src={imagens.horizontal} alt="" className="compra-capa" key={imagens.horizontal} />
                    {jaPossui ? (
                        <div className="compra-possui">
                            <IconeBiblioteca tamanho={18} />
                            <div>
                                <strong>Na sua biblioteca</strong>
                                <span>Sua chave está disponível para ativação.</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Preco jogo={jogo} tamanho="grande" />
                            {jogo.desconto > 0 && <span className="compra-economia">Economize {formatarPreco(jogo.preco - final)}</span>}
                            <dl className="compra-condicoes">
                                <div>
                                    <dt>Pix</dt>
                                    <dd>{formatarPreco(final * (1 - DESCONTO_PIX / 100))}</dd>
                                </div>
                                <div>
                                    <dt>Cartão</dt>
                                    <dd>
                                        {parcelas.quantidade}x de {formatarPreco(parcelas.valor)} sem juros
                                    </dd>
                                </div>
                            </dl>
                        </>
                    )}

                    <div className="compra-botoes">
                        {jaPossui ? (
                            <button type="button" className="botao botao-primario botao-largo" onClick={() => navegar("/biblioteca")}>
                                <IconeBiblioteca tamanho={16} /> Ver na biblioteca
                            </button>
                        ) : (
                            <>
                                <button type="button" className="botao botao-primario botao-largo" onClick={() => comprarAgora(jogo)}>
                                    Comprar agora
                                </button>
                                <button type="button" className={noCarrinho ? "botao botao-secundario botao-largo ativo" : "botao botao-secundario botao-largo"} onClick={() => adicionarAoCarrinho(jogo)}>
                                    {noCarrinho ? <IconeCheck tamanho={16} /> : <IconeCarrinho tamanho={16} />}
                                    {noCarrinho ? "No carrinho" : "Adicionar ao carrinho"}
                                </button>
                            </>
                        )}
                        <button type="button" className="botao botao-secundario botao-largo" onClick={() => presentear(jogo)}>
                            <IconePresente tamanho={16} /> Presentear
                        </button>
                        <div className="compra-secundarias">
                            <button type="button" className={desejado ? "botao botao-fantasma ativo" : "botao botao-fantasma"} onClick={() => alternarDesejo(jogo)} aria-pressed={desejado}>
                                <IconeCoracao tamanho={15} preenchido={desejado} /> {desejado ? "Desejado" : "Desejar"}
                            </button>
                            <button type="button" className={comparando ? "botao botao-fantasma ativo" : "botao botao-fantasma"} onClick={() => alternarComparar(jogo)} aria-pressed={comparando}>
                                <IconeComparar tamanho={15} /> {comparando ? "Comparando" : "Comparar"}
                            </button>
                        </div>
                    </div>

                    <ul className="compra-garantias">
                        <li>
                            <IconeRaio tamanho={15} /> Entrega instantânea da chave
                        </li>
                        <li>
                            <IconeEscudo tamanho={15} /> Chave oficial para {jogo.plataformas[0]}
                            {jogo.plataformas.length > 1 && ` e mais ${jogo.plataformas.length - 1}`}
                        </li>
                        <li>
                            <IconeDesfazer tamanho={15} /> Reembolso em até {DIAS_REEMBOLSO} dias
                        </li>
                    </ul>
                </aside>
            </div>

            <section className="secao">
                <h2 className="titulo-secao">Você também pode gostar</h2>
                <div className="grade">
                    {jogosSemelhantes(jogo, jogos).map((outro) => (
                        <CardJogo key={outro.id} jogo={outro} />
                    ))}
                </div>
            </section>
        </div>
    );
}

export default PaginaJogo;
