// Carrossel de destaques da página inicial: slide central grande com os vizinhos nas laterais.
import { useEffect, useState } from "react";
import { useLoja } from "../../utilidades/LojaContext.js";
import { capturasDoJogo, imagensDoJogo, resumoAvaliacoes } from "../../utilidades/funcoes.js";
import { AcoesRapidas, Imagem, Plataformas, Preco } from "../comum/CardJogo.jsx";
import { IconeCarrinho, IconeCheck, IconePlay, IconeSetaDireita, IconeSetaEsquerda } from "../comum/Icones.jsx";
import { usePreviaTrailer } from "../../utilidades/hooks.js";
import Trailer from "../comum/Trailer.jsx";

const INTERVALO = 7000;

function Slide({ jogo, ativo, perto, primeiro, aoClicarVizinho }) {
    const { abrirJogo, adicionarAoCarrinho, estaNoCarrinho } = useLoja();
    const [previa, setPrevia] = useState(null);
    const imagens = imagensDoJogo(jogo);
    const capturas = capturasDoJogo(jogo).slice(0, 4);
    const noCarrinho = estaNoCarrinho(jogo.id);
    const [trailer, eventosTrailer] = usePreviaTrailer(450);

    return (
        <div className={ativo ? "slide ativo" : "slide"} aria-hidden={!ativo} inert={!ativo}>
            <button type="button" className="slide-midia" onClick={() => abrirJogo(jogo.id)} aria-label={`Ver ${jogo.nome}`} {...eventosTrailer}>
                {/* A arte aparece inteira; a mesma imagem desfocada preenche as sobras. */}
                <Imagem src={imagens.destaque} alternativa={imagens.horizontal} alt="" className="arte-fundo" aria-hidden="true" loading={perto ? "eager" : "lazy"} />
                <Imagem src={imagens.destaque} alternativa={imagens.horizontal} alt="" className={previa ? "arte oculta" : "arte"} loading={perto ? "eager" : "lazy"} fetchPriority={primeiro ? "high" : "auto"} />
                {previa && <img src={previa} alt="" className="slide-previa" />}
                {ativo && trailer && !previa && <Trailer jogo={jogo} className="slide-trailer" />}
                {jogo.trailer && (
                    <span className="slide-selo-trailer" aria-hidden="true">
                        <IconePlay tamanho={11} /> Trailer
                    </span>
                )}
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
                            {ativo && <Imagem src={captura.mini} alt="" />}
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
                        <Preco jogo={jogo} />
                    </div>
                    <div className="slide-botoes">
                        <button type="button" className="botao botao-primario" onClick={() => adicionarAoCarrinho(jogo)}>
                            {noCarrinho ? <IconeCheck tamanho={16} /> : <IconeCarrinho tamanho={16} />}
                            {noCarrinho ? "No carrinho" : "Adicionar ao carrinho"}
                        </button>
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
                            <Slide key={`${jogo.id}-${indice}`} jogo={jogo} ativo={indice === posicao} perto={Math.abs(indice - posicao) <= 1} primeiro={indice === 1} aoClicarVizinho={() => irPara(indice)} />
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
