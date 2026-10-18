import { useEffect, useState } from "react";
import { useLoja } from "../LojaContext.js";
import { capturasDoJogo, imagensDoJogo, resumoAvaliacoes } from "../utils.js";
import { AcoesRapidas, Imagem, Plataformas, Preco } from "./CardJogo.jsx";
import { IconeBiblioteca, IconeCarrinho, IconeCheck, IconeSetaDireita, IconeSetaEsquerda } from "./Icones.jsx";

const INTERVALO = 7000;

function Slide({ jogo, ativo, primeiro, aoClicarVizinho }) {
    const { abrirJogo, adicionarAoCarrinho, estaNoCarrinho, possui } = useLoja();
    const [previa, setPrevia] = useState(null);
    const imagens = imagensDoJogo(jogo);
    const capturas = capturasDoJogo(jogo).slice(0, 4);
    const noCarrinho = estaNoCarrinho(jogo.id);
    const jaPossui = possui(jogo.id);

    return (
        <div className={ativo ? "slide ativo" : "slide"} aria-hidden={!ativo} inert={!ativo}>
            <button type="button" className="slide-midia" onClick={() => abrirJogo(jogo.id)} aria-label={`Ver ${jogo.nome}`}>
                <Imagem src={imagens.destaque} alternativa={imagens.horizontal} alt="" className={previa ? "oculta" : ""} loading="eager" fetchPriority={primeiro ? "high" : "auto"} />
                {previa && <img src={previa} alt="" className="slide-previa" />}
            </button>

            <div className="slide-info">
                <button type="button" className="slide-nome" onClick={() => abrirJogo(jogo.id)}>
                    {jogo.nome}
                </button>
                <span className="slide-avaliacao">
                    <strong>{resumoAvaliacoes(jogo.nota)}</strong> · nota {jogo.nota.toFixed(1)}
                </span>
                <div className="slide-capturas" onMouseLeave={() => setPrevia(null)}>
                    {capturas.map((captura) => (
                        <button
                            type="button"
                            key={captura.mini}
                            onMouseEnter={() => setPrevia(captura.mini)}
                            onFocus={() => setPrevia(captura.mini)}
                            onBlur={() => setPrevia(null)}
                            onClick={() => abrirJogo(jogo.id)}
                            aria-label={`Captura de tela de ${jogo.nome}`}
                        >
                            <Imagem src={captura.mini} alt="" loading="eager" />
                        </button>
                    ))}
                </div>
                <div className="slide-compra">
                    <span className="slide-motivo">
                        <strong>{jogo.desconto > 0 ? "Oferta" : jogo.lancamento >= 2025 ? "Lançamento" : "Em alta"}</strong>{" "}
                        {jogo.desconto > 0 ? "por tempo limitado" : `em ${jogo.generos.slice(0, 2).join(" e ")}`}
                    </span>
                    <div className="slide-linha">
                        <Plataformas lista={jogo.plataformas} />
                        {jaPossui ? (
                            <span className="na-biblioteca">
                                <IconeBiblioteca tamanho={15} /> Na biblioteca
                            </span>
                        ) : (
                            <Preco jogo={jogo} />
                        )}
                    </div>
                    <div className="slide-botoes">
                        {!jaPossui && (
                            <button type="button" className="botao botao-primario" onClick={() => adicionarAoCarrinho(jogo)}>
                                {noCarrinho ? <IconeCheck tamanho={16} /> : <IconeCarrinho tamanho={16} />}
                                {noCarrinho ? "No carrinho" : "Adicionar ao carrinho"}
                            </button>
                        )}
                        <AcoesRapidas jogo={jogo} />
                    </div>
                </div>
            </div>

            {/* Vizinho visível na lateral: um clique leva até ele. */}
            {!ativo && <button type="button" className="slide-vizinho" onClick={aoClicarVizinho} aria-label={`Ir para ${jogo.nome}`} tabIndex={-1} />}
        </div>
    );
}

function Destaques({ jogos }) {
    const total = jogos.length;
    // Cópias nas pontas para o carrossel ser infinito: [último, ...jogos, primeiro].
    const itens = [jogos[total - 1], ...jogos, jogos[0]];
    const [posicao, setPosicao] = useState(1);
    const [animar, setAnimar] = useState(true);
    const [pausado, setPausado] = useState(false);
    const atual = (posicao - 1 + total) % total;

    useEffect(() => {
        if (pausado) return;
        const tempo = setTimeout(() => irPara(posicao + 1), INTERVALO);
        return () => clearTimeout(tempo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [posicao, pausado, animar]);

    // Reativa a transição no quadro seguinte a um salto instantâneo.
    useEffect(() => {
        if (animar) return;
        const quadro = requestAnimationFrame(() => requestAnimationFrame(() => setAnimar(true)));
        return () => cancelAnimationFrame(quadro);
    }, [animar]);

    function irPara(nova) {
        if (!animar) return;
        setPosicao(Math.max(0, Math.min(nova, total + 1)));
    }

    function aoTerminar(evento) {
        if (evento.target !== evento.currentTarget) return;
        if (posicao === 0 || posicao === total + 1) {
            setAnimar(false);
            setPosicao(posicao === 0 ? total : 1);
        }
    }

    return (
        <section className="destaques" aria-roledescription="carrossel" aria-label="Destaques e recomendados">
            <div className="secao-topo">
                <h2 className="titulo-secao">Destaques e recomendados</h2>
            </div>
            <div className="destaques-moldura">
                <div
                    className="destaques-palco"
                    onMouseEnter={() => setPausado(true)}
                    onMouseLeave={() => setPausado(false)}
                    onFocus={() => setPausado(true)}
                    onBlur={() => setPausado(false)}
                >
                    <div className={animar ? "destaques-trilho" : "destaques-trilho sem-transicao"} style={{ "--posicao": posicao }} onTransitionEnd={aoTerminar}>
                        {itens.map((jogo, indice) => (
                            <Slide key={`${jogo.id}-${indice}`} jogo={jogo} ativo={indice === posicao} primeiro={indice === 1} aoClicarVizinho={() => irPara(indice)} />
                        ))}
                    </div>
                </div>
                <button type="button" className="destaques-seta esquerda" onClick={() => irPara(posicao - 1)} aria-label="Destaque anterior">
                    <IconeSetaEsquerda tamanho={34} />
                </button>
                <button type="button" className="destaques-seta direita" onClick={() => irPara(posicao + 1)} aria-label="Próximo destaque">
                    <IconeSetaDireita tamanho={34} />
                </button>
            </div>
            <div className="destaques-pontos">
                {jogos.map((jogo, indice) => (
                    <button
                        type="button"
                        key={jogo.id}
                        className={indice === atual ? "ativo" : ""}
                        onClick={() => irPara(indice + 1)}
                        aria-label={`Mostrar ${jogo.nome}`}
                        aria-current={indice === atual}
                    >
                        {indice === atual && <span key={`${posicao}-${pausado}`} className={pausado ? "pausado" : ""} style={{ animationDuration: `${INTERVALO}ms` }} />}
                    </button>
                ))}
            </div>
        </section>
    );
}

export default Destaques;
