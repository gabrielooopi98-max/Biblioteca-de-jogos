import { useEffect, useRef, useState } from "react";
import { useLoja } from "../LojaContext.js";
import { imagensDoJogo } from "../utils.js";
import { Imagem, Preco } from "./CardJogo.jsx";
import { IconeCarrinho, IconeCheck, IconeCoracao, IconeMudo, IconeSeta, IconeSetaDireita, IconeSetaEsquerda, IconeSom } from "./Icones.jsx";
import { Contador } from "./Secoes.jsx";
import Trailer from "./Trailer.jsx";

// Cartas visíveis de cada lado da capa ativa no baralho.
const LATERAIS = 2;
const dois = (n) => String(n).padStart(2, "0");
// Arraste: movimento mínimo para virar arraste, resistência nas pontas e alcance do impulso.
const LIMIAR_ARRASTE = 6;
const LIMITE_ELASTICO = 2;
const IMPULSO_MS = 160;
const semMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Até 720px o fundo usa a capa 600x900 (a mesma do baralho, já em cache): a arte larga de 1920px
// pesaria ~250 KB por jogo para aparecer recortada e escurecida. "200px" faz até tela 3x escolher a capa.
// Igual ao preload do index.html.
const FUNDO_SIZES = "(max-width: 720px) 200px, 100vw";

// Trailer de fundo só no PC (mouse) e sem economia de dados. Toca também no modo suave
// ("reduzir movimento" do sistema): é mudo, fica atrás da arte escurecida e não mexe no layout.
function podeTocarVideo() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches && !navigator.connection?.saveData;
}

// Distância circular entre a carta i e a ativa: -3…4 para 8 jogos.
function distancia(i, ativo, total) {
    let d = (i - ativo + total) % total;
    if (d > total / 2) d -= total;
    return d;
}

// Coreografia de cada troca (Web Animations API, por cima do reposicionamento em CSS):
// a capa que chega sobe em arco e cresce, a que sai afunda, as outras balançam como cartas embaralhadas.
function coreografar(cartas, { ativo, anterior, direcao }, total) {
    const curva = "cubic-bezier(0.33, 0, 0.15, 1)";
    cartas.forEach((corpo, i) => {
        if (!corpo) return;
        const d = distancia(i, ativo, total);
        if (Math.abs(d) > LATERAIS + 1) return;
        if (i === ativo) {
            corpo.animate(
                [
                    { transform: "none" },
                    { transform: `translateY(-34px) scale(1.07) rotate(${-direcao * 3}deg)`, offset: 0.42 },
                    { transform: `translateY(4px) scale(0.995) rotate(${direcao * 0.6}deg)`, offset: 0.78 },
                    { transform: "none" },
                ],
                { duration: 1150, easing: curva },
            );
        } else if (i === anterior) {
            corpo.animate(
                [{ transform: "none" }, { transform: `translateY(18px) scale(0.94) rotate(${direcao * 4}deg)`, offset: 0.38 }, { transform: "none" }],
                { duration: 1050, easing: curva },
            );
        } else {
            corpo.animate(
                [{ transform: "none" }, { transform: `translateY(-6px) rotate(${direcao * 3}deg)`, offset: 0.34 }, { transform: "none" }],
                { duration: 950, delay: Math.abs(d) * 45, easing: curva },
            );
        }
    });
}

// Resposta ao clique numa seta: o botão quica, uma onda se expande, a seta dá um tranco
// no sentido do clique e uma faixa de luz varre o baralho no mesmo sentido.
function disparar(botao, varredura, sentido) {
    if (!botao) return;
    const mola = "cubic-bezier(0.34, 1.56, 0.64, 1)";
    botao.animate([{ scale: 0.84 }, { scale: 1.08, offset: 0.45 }, { scale: 1 }], { duration: 560, easing: mola });
    botao.querySelector(".hero-seta-onda")?.animate(
        [
            { opacity: 0.75, transform: "scale(1)" },
            { opacity: 0, transform: "scale(2.1)" },
        ],
        { duration: 700, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
    botao.querySelector(".hero-seta-icones")?.animate(
        [{ transform: "none" }, { transform: `translateX(${sentido * 8}px)`, offset: 0.3 }, { transform: "none" }],
        { duration: 600, easing: mola },
    );
    varredura?.animate(
        [
            { transform: `translateX(${-sentido * 70}%) skewX(-14deg)`, opacity: 0 },
            { opacity: 1, offset: 0.35 },
            { transform: `translateX(${sentido * 70}%) skewX(-14deg)`, opacity: 0 },
        ],
        { duration: 950, easing: "cubic-bezier(0.33, 0, 0.15, 1)" },
    );
}

// Banner de abertura: vitrine cinematográfica dos melhores descontos da loja.
// Fundo com a arte (e depois o trailer) do jogo em foco, baralho 3D de capas e troca automática.
// titulo em cima (cheio) e destaque embaixo (contorno), ex.: "Melhores" / "descontos".
function BannerDistribuidora({ titulo, destaque, personagem, jogos }) {
    const { abrirJogo, adicionarAoCarrinho, alternarDesejo, estaNoCarrinho, estaNosDesejos } = useLoja();
    const total = jogos.length;
    const [estado, setEstado] = useState(() => ({ ativo: Math.max(0, jogos.findIndex((j) => j.id === personagem.id)), anterior: null, direcao: 1 }));
    const [pausado, setPausado] = useState(false);
    const [comSom, setComSom] = useState(false);
    const [video, setVideo] = useState(null);
    const [comVideo] = useState(podeTocarVideo);
    const [naTela, setNaTela] = useState(true);
    // a arte do próximo jogo só começa a baixar depois que a abertura terminou de carregar
    const [adiantarProximo, setAdiantarProximo] = useState(false);
    const vistosRef = useRef(new Set());
    const secaoRef = useRef(null);
    const cartasRef = useRef([]);
    const setasRef = useRef({});
    const varreduraRef = useRef(null);
    const baralhoRef = useRef(null);
    const arrasto = useRef(null);
    const suprimirClique = useRef(false);
    const ultimaRoda = useRef(0);
    const quadro = useRef(0);

    const { ativo, direcao } = estado;
    const jogo = jogos[ativo];
    const duracao = comVideo ? 14000 : 8000;
    const descontoMaximo = Math.max(...jogos.map((j) => j.desconto));
    const parado = pausado || comSom || !naTela;
    const chaveTempo = `${ativo}-${parado}`;

    // Vai para o jogo i; sem direção explícita, segue o lado em que ele está no baralho.
    function ir(i, sentido, origem = "toque") {
        setEstado((atual) => {
            const novo = (i + total) % total;
            if (novo === atual.ativo) return atual;
            return { ativo: novo, anterior: atual.ativo, direcao: sentido ?? (distancia(novo, atual.ativo, total) > 0 ? 1 : -1), origem };
        });
    }

    // Troca automática (parada enquanto o mouse está em cima ou o som está ligado).
    useEffect(() => {
        if (parado) return;
        const tempo = setTimeout(() => ir(ativo + 1, 1), duracao);
        return () => clearTimeout(tempo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ativo, parado, duracao]);

    // Coreografia das capas a cada troca.
    useEffect(() => {
        if (estado.anterior === null || estado.origem === "arraste" || semMovimento()) return;
        coreografar(cartasRef.current, estado, total);
    }, [estado, total]);

    // O trailer entra depois de a arte assentar, para a troca não piscar.
    useEffect(() => {
        if (!comVideo) return;
        const tempo = setTimeout(() => setVideo(jogos[ativo].id), 1300);
        return () => clearTimeout(tempo);
    }, [ativo, comVideo, jogos]);

    useEffect(() => () => cancelAnimationFrame(quadro.current), []);

    useEffect(() => {
        const tempo = setTimeout(() => setAdiantarProximo(true), 2500);
        return () => clearTimeout(tempo);
    }, []);

    // Fora da tela: o trailer sai (para de baixar vídeo) e a troca automática espera.
    useEffect(() => {
        const secao = secaoRef.current;
        if (!secao || !("IntersectionObserver" in window)) return;
        const observador = new IntersectionObserver(([entrada]) => setNaTela(entrada.isIntersecting));
        observador.observe(secao);
        return () => observador.disconnect();
    }, []);

    // --cx/--cy vão só no fundo e no palco 3D (e não herdam, ver @property no CSS):
    // mexer o mouse não recalcula o estilo de cada carta, capa e botão do banner.
    function inclinar(cx, cy) {
        for (const alvo of secaoRef.current?.querySelectorAll(".hero-fundo, .hero-cena") ?? []) {
            alvo.style.setProperty("--cx", cx);
            alvo.style.setProperty("--cy", cy);
        }
    }

    // Inclinação do baralho e paralaxe do fundo seguindo o cursor.
    function mover(evento) {
        if (evento.pointerType !== "mouse") return;
        const { clientX, clientY } = evento;
        cancelAnimationFrame(quadro.current);
        quadro.current = requestAnimationFrame(() => {
            const secao = secaoRef.current;
            if (!secao) return;
            const r = secao.getBoundingClientRect();
            inclinar(((clientX - r.left) / r.width - 0.5).toFixed(3), ((clientY - r.top) / r.height - 0.5).toFixed(3));
        });
    }

    function sair() {
        setPausado(false);
        cancelAnimationFrame(quadro.current);
        // pode chegar depois de a seção sair da tela (ao abrir um jogo)
        inclinar(0, 0);
    }

    // Setas (na tela ou do teclado): troca e dispara a animação do botão correspondente.
    function passar(sentido) {
        ir(ativo + sentido, sentido);
        disparar(setasRef.current[sentido], varreduraRef.current, sentido);
    }

    function teclar(evento) {
        if (evento.key === "ArrowRight") passar(1);
        if (evento.key === "ArrowLeft") passar(-1);
    }

    // --- Arrastar o baralho (mouse ou dedo): as capas seguem ao vivo e encaixam ao soltar ---
    // --arrasto vai em cada carta (não herda, ver @property no CSS): só as 8 cartas recalculam por quadro.
    function definirArrasto(valor) {
        for (const corpo of cartasRef.current) corpo?.parentElement.style.setProperty("--arrasto", valor);
    }

    function comecarArraste(evento) {
        if (evento.button !== 0) return;
        const carta = baralhoRef.current.querySelector(".hero-carta.ativa");
        arrasto.current = {
            id: evento.pointerId,
            x0: evento.clientX,
            y0: evento.clientY,
            passo: (carta?.offsetWidth || 220) * 0.54,
            passos: 0,
            ativo: false,
            ultimoX: evento.clientX,
            ultimoT: evento.timeStamp,
            velocidade: 0,
        };
    }

    function arrastar(evento) {
        const a = arrasto.current;
        if (!a || evento.pointerId !== a.id) return;
        const dx = evento.clientX - a.x0;
        const dy = evento.clientY - a.y0;
        if (!a.ativo) {
            if (Math.abs(dx) < LIMIAR_ARRASTE && Math.abs(dy) < LIMIAR_ARRASTE) return;
            // gesto vertical: é rolagem da página, não arraste
            if (Math.abs(dy) > Math.abs(dx)) {
                arrasto.current = null;
                return;
            }
            a.ativo = true;
            baralhoRef.current.setPointerCapture(evento.pointerId);
            baralhoRef.current.classList.add("arrastando");
            setPausado(true);
        }
        const intervalo = Math.max(1, evento.timeStamp - a.ultimoT);
        a.velocidade = (evento.clientX - a.ultimoX) / intervalo;
        a.ultimoX = evento.clientX;
        a.ultimoT = evento.timeStamp;
        // arrastar para a esquerda avança; passando de 2 capas, a resistência cresce
        let passos = -dx / a.passo;
        if (Math.abs(passos) > LIMITE_ELASTICO) passos = Math.sign(passos) * (LIMITE_ELASTICO + (Math.abs(passos) - LIMITE_ELASTICO) * 0.3);
        a.passos = passos;
        definirArrasto(passos.toFixed(3));
    }

    function soltarArraste(evento) {
        const a = arrasto.current;
        arrasto.current = null;
        if (!a?.ativo) return;
        const baralho = baralhoRef.current;
        baralho.classList.remove("arrastando");
        definirArrasto("0");
        if (baralho.hasPointerCapture(evento.pointerId)) baralho.releasePointerCapture(evento.pointerId);
        // projeta o movimento pela velocidade do gesto: um "peteleco" leva à próxima capa
        const projetado = a.passos - (a.velocidade * IMPULSO_MS) / a.passo;
        const n = Math.max(-3, Math.min(3, Math.round(projetado)));
        if (n !== 0) ir(ativo + n, Math.sign(n), "arraste");
        suprimirClique.current = true;
        setTimeout(() => (suprimirClique.current = false), 0);
        if (evento.pointerType !== "mouse") setPausado(false);
    }

    // o clique que encerra um arraste não pode abrir nem destacar a capa
    function filtrarClique(evento) {
        if (!suprimirClique.current) return;
        evento.preventDefault();
        evento.stopPropagation();
    }

    // gesto horizontal do trackpad troca de capa (o vertical continua rolando a página)
    function rodar(evento) {
        if (Math.abs(evento.deltaX) < 24 || Math.abs(evento.deltaX) < Math.abs(evento.deltaY)) return;
        if (evento.timeStamp - ultimaRoda.current < 650) return;
        ultimaRoda.current = evento.timeStamp;
        passar(evento.deltaX > 0 ? 1 : -1);
    }

    // --- Capa holográfica: a da frente inclina seguindo o cursor ---
    function inclinarCapa(evento) {
        if (evento.pointerType !== "mouse" || arrasto.current?.ativo) return;
        const capa = evento.currentTarget;
        const r = capa.getBoundingClientRect();
        capa.style.setProperty("--tx", ((evento.clientX - r.left) / r.width - 0.5).toFixed(3));
        capa.style.setProperty("--ty", ((evento.clientY - r.top) / r.height - 0.5).toFixed(3));
    }

    function endireitarCapa(evento) {
        evento.currentTarget.style.setProperty("--tx", 0);
        evento.currentTarget.style.setProperty("--ty", 0);
    }

    return (
        <section
            ref={secaoRef}
            className={naTela ? "hero" : "hero fora-da-tela"}
            aria-roledescription="carrossel"
            aria-label={`${titulo} ${destaque}`}
            onPointerEnter={(e) => e.pointerType === "mouse" && setPausado(true)}
            onPointerMove={mover}
            onPointerLeave={sair}
            onKeyDown={teclar}
        >
            <div className="hero-fundo" aria-hidden="true">
                {jogos.map((j, i) => {
                    // No DOM: a arte atual, a anterior já vista (ainda saindo) e, depois da abertura, a próxima.
                    const d = distancia(i, ativo, total);
                    if (d === 0) vistosRef.current.add(j.id);
                    const manter = d === 0 || (d === 1 && adiantarProximo) || (Math.abs(d) === 1 && vistosRef.current.has(j.id));
                    if (!manter) return null;
                    const imagens = imagensDoJogo(j);
                    return (
                        <Imagem
                            key={j.id}
                            src={imagens.banner}
                            srcSet={`${imagens.capaPequena} 600w, ${imagens.banner} 1920w`}
                            sizes={FUNDO_SIZES}
                            alternativa={j.fundo}
                            alt=""
                            loading="eager"
                            className={i === ativo ? "ativa" : ""}
                        />
                    );
                })}
                {comVideo && naTela && video === jogo.id && <Trailer key={jogo.id} jogo={jogo} mudo={!comSom} inicio={12} alturaMax={480} className="hero-trailer" />}
            </div>
            <div className="hero-grao" aria-hidden="true" />

            <div className="hero-conteudo">
                <div className="hero-texto">
                    <span className="hero-selo">
                        <span className="hero-ponto" aria-hidden="true" />
                        Ofertas especiais
                        <span className="hero-tempo">
                            termina em <Contador />
                        </span>
                    </span>

                    <h2 className="hero-marca">
                        <span className="hero-linha">
                            <span>{titulo}</span>
                        </span>
                        <span className="hero-linha">
                            <span className="hero-contorno">{destaque}</span>
                            <small>
                                até <strong>-{descontoMaximo}%</strong>
                                <br />
                                em {total} jogos
                            </small>
                        </span>
                    </h2>

                    <div className="hero-jogo" key={jogo.id} aria-live="polite">
                        <span className="hero-rotulo">
                            {jogo.generos.slice(0, 2).join(" · ")} · {jogo.lancamento}
                        </span>
                        <h3 className="hero-nome">{jogo.nome}</h3>
                        <Preco jogo={jogo} tamanho="grande" />
                    </div>
                </div>

                {/* eventos no contêiner 2D: o palco 3D não recebe ponteiro (empataria em profundidade com a capa da frente) */}
                <div
                    className="hero-baralho"
                    ref={baralhoRef}
                    onPointerDown={comecarArraste}
                    onPointerMove={arrastar}
                    onPointerUp={soltarArraste}
                    onPointerCancel={soltarArraste}
                    onClickCapture={filtrarClique}
                    onWheel={rodar}
                >
                    <span className="hero-chao" aria-hidden="true" />
                    <span className="hero-varredura" ref={varreduraRef} aria-hidden="true" />
                    <div className="hero-cena">
                        {jogos.map((j, i) => {
                            const d = distancia(i, ativo, total);
                            const visivel = Math.abs(d) <= LATERAIS;
                            const frente = d === 0;
                            const imagens = imagensDoJogo(j);
                            const desejado = estaNosDesejos(j.id);
                            const noCarrinho = estaNoCarrinho(j.id);
                            return (
                                <div key={j.id} className={frente ? "hero-carta ativa" : "hero-carta"} style={{ "--d": d, "--ordem": i }} aria-hidden={!visivel}>
                                    <div
                                        className="hero-carta-corpo"
                                        ref={(el) => {
                                            cartasRef.current[i] = el;
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className="hero-capa"
                                            onClick={() => (frente ? abrirJogo(j.id) : ir(i))}
                                            onPointerMove={frente ? inclinarCapa : undefined}
                                            onPointerLeave={frente ? endireitarCapa : undefined}
                                            tabIndex={visivel ? 0 : -1}
                                            aria-label={frente ? `Abrir ${j.nome}` : `Destacar ${j.nome}`}
                                            draggable={false}
                                        >
                                            <Imagem
                                                src={imagens.capa}
                                                srcSet={`${imagens.capaPequena} 300w, ${imagens.capa} 600w`}
                                                sizes="(max-width: 720px) 128px, (max-width: 1000px) 168px, 256px"
                                                alternativa={imagens.horizontal}
                                                alt=""
                                                loading={visivel ? "eager" : "lazy"}
                                                draggable={false}
                                            />
                                        </button>
                                        {j.desconto > 0 && <span className="hero-carta-desconto">-{j.desconto}%</span>}
                                        {frente ? (
                                            <div className="hero-carta-acoes">
                                                <button
                                                    type="button"
                                                    className={desejado ? "ativa" : ""}
                                                    onClick={() => alternarDesejo(j)}
                                                    aria-pressed={desejado}
                                                    aria-label={desejado ? `Remover ${j.nome} dos desejos` : `Desejar ${j.nome}`}
                                                >
                                                    <IconeCoracao tamanho={16} preenchido={desejado} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className={noCarrinho ? "ativa" : ""}
                                                    onClick={() => adicionarAoCarrinho(j)}
                                                    aria-label={noCarrinho ? `${j.nome} já está no carrinho` : `Adicionar ${j.nome} ao carrinho`}
                                                >
                                                    {noCarrinho ? <IconeCheck tamanho={16} /> : <IconeCarrinho tamanho={16} />}
                                                </button>
                                                <button type="button" className="hero-carta-ver" onClick={() => abrirJogo(j.id)}>
                                                    Ver <IconeSeta tamanho={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="hero-carta-nome" aria-hidden="true">
                                                {j.nome}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="hero-rodape">
                <div className="hero-progresso">
                    {jogos.map((j, i) => (
                        <button
                            type="button"
                            key={j.id}
                            className={i === ativo ? "ativo" : i < ativo ? "visto" : ""}
                            onClick={() => ir(i)}
                            aria-label={`Mostrar ${j.nome}`}
                            aria-current={i === ativo}
                        >
                            {i === ativo && <span key={chaveTempo} className={parado ? "parado" : ""} style={{ animationDuration: `${duracao}ms` }} />}
                        </button>
                    ))}
                </div>

                <div className="hero-navegacao">
                    {comVideo && (
                        <>
                            <button
                                type="button"
                                className="hero-seta hero-som"
                                onClick={() => setComSom((s) => !s)}
                                aria-pressed={comSom}
                                aria-label={comSom ? "Desligar som do trailer" : "Ligar som do trailer"}
                            >
                                {comSom ? <IconeSom tamanho={18} /> : <IconeMudo tamanho={18} />}
                            </button>
                            <span className="hero-divisor" aria-hidden="true" />
                        </>
                    )}
                    <button
                        type="button"
                        className="hero-seta"
                        data-sentido="anterior"
                        ref={(el) => {
                            setasRef.current[-1] = el;
                        }}
                        onClick={() => passar(-1)}
                        aria-label="Jogo anterior"
                    >
                        <span className="hero-seta-onda" aria-hidden="true" />
                        <span className="hero-seta-icones" aria-hidden="true">
                            <IconeSetaEsquerda tamanho={18} />
                            <IconeSetaEsquerda tamanho={18} />
                        </span>
                    </button>
                    <span className="hero-contador" aria-hidden="true">
                        <span className="hero-contador-janela">
                            <span key={ativo} className="hero-contador-atual" data-sentido={direcao > 0 ? "frente" : "tras"}>
                                {dois(ativo + 1)}
                            </span>
                        </span>
                        <i />
                        {dois(total)}
                    </span>
                    <button
                        type="button"
                        className="hero-seta"
                        data-sentido="proximo"
                        ref={(el) => {
                            setasRef.current[1] = el;
                        }}
                        onClick={() => passar(1)}
                        aria-label="Próximo jogo"
                    >
                        <span className="hero-seta-onda" aria-hidden="true" />
                        {/* anel que se fecha até a próxima troca automática */}
                        <svg className="hero-anel" viewBox="0 0 48 48" aria-hidden="true">
                            <circle className="hero-anel-trilho" cx="24" cy="24" r="23" />
                            <circle key={chaveTempo} className={parado ? "hero-anel-tempo parado" : "hero-anel-tempo"} cx="24" cy="24" r="23" pathLength="100" style={{ animationDuration: `${duracao}ms` }} />
                        </svg>
                        <span className="hero-seta-icones" aria-hidden="true">
                            <IconeSetaDireita tamanho={18} />
                            <IconeSetaDireita tamanho={18} />
                        </span>
                    </button>
                </div>
            </div>
        </section>
    );
}

export default BannerDistribuidora;
