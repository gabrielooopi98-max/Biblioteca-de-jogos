// Áreas temáticas da página inicial: Soulslike e Resident Evil, cada uma com o visual da franquia.
import { useEffect, useRef, useState } from "react";
import { useLoja } from "../../utilidades/LojaContext.js";
import { imagensDoJogo } from "../../utilidades/funcoes.js";
import { Imagem, Preco } from "../comum/CardJogo.jsx";
import { IconeCarrinho, IconeCheck, IconeSeta } from "../comum/Icones.jsx";

const semMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// "acordado": a seção já apareceu (dispara as entradas uma vez).
// "naTela": está visível agora (fora dela, as animações contínuas pausam).
function useAcordar() {
    const ref = useRef(null);
    const [acordado, setAcordado] = useState(false);
    const [naTela, setNaTela] = useState(false);

    useEffect(() => {
        const elemento = ref.current;
        if (!elemento || !("IntersectionObserver" in window)) {
            setAcordado(true);
            setNaTela(true);
            return;
        }
        const observador = new IntersectionObserver(
            ([entrada]) => {
                setNaTela(entrada.isIntersecting);
                if (entrada.intersectionRatio >= 0.25) setAcordado(true);
            },
            { threshold: [0, 0.25] },
        );
        observador.observe(elemento);
        return () => observador.disconnect();
    }, []);

    return [ref, acordado, naTela];
}

// Seleção que segue o cursor (como num menu de jogo), com um respiro para não trocar a cada pixel.
function useSelecao(inicial) {
    const [selecionado, setSelecionado] = useState(inicial);
    const espera = useRef(0);

    useEffect(() => () => clearTimeout(espera.current), []);

    function apontar(id) {
        clearTimeout(espera.current);
        espera.current = setTimeout(() => setSelecionado(id), 110);
    }

    function escolher(id) {
        clearTimeout(espera.current);
        setSelecionado(id);
    }

    return [selecionado, apontar, escolher];
}

// Botão de carrinho compartilhado pelas duas áreas.
function BotaoCarrinho({ jogo }) {
    const { adicionarAoCarrinho, estaNoCarrinho } = useLoja();
    const noCarrinho = estaNoCarrinho(jogo.id);
    return (
        <button type="button" className="botao botao-secundario" onClick={() => adicionarAoCarrinho(jogo)} aria-label={noCarrinho ? `${jogo.nome} já está no carrinho` : `Adicionar ${jogo.nome} ao carrinho`}>
            {noCarrinho ? <IconeCheck tamanho={16} /> : <IconeCarrinho tamanho={16} />}
            {noCarrinho ? "No carrinho" : "Adicionar"}
        </button>
    );
}

/* ==========================================================================
   Soulslike: galeria épica (sanfona de capas)
   ========================================================================== */

// Troca automática de painel; pausa com o mouse em cima, com foco dentro ou fora da tela.
const INTERVALO_SANFONA = 6000;
const ehComputador = () => window.matchMedia("(min-width: 721px)").matches;

export function UniversoSouls({ jogos, aoVerTodos }) {
    const { abrirJogo } = useLoja();
    const [secaoRef, , naTela] = useAcordar();
    const [aberto, setAberto] = useState(jogos[0]?.id);
    const [pausado, setPausado] = useState(false);
    const espera = useRef(0);
    const quadro = useRef(0);
    // a arte larga só é baixada quando o painel abre pela primeira vez (e fica para as próximas)
    const abertos = useRef(new Set());
    abertos.current.add(aberto);

    const parado = pausado || !naTela;
    const chaveTempo = `${aberto}-${parado}`;

    useEffect(() => () => {
        clearTimeout(espera.current);
        cancelAnimationFrame(quadro.current);
    }, []);

    useEffect(() => {
        if (parado || !ehComputador()) return;
        const tempo = setTimeout(() => {
            const i = jogos.findIndex((j) => j.id === aberto);
            setAberto(jogos[(i + 1) % jogos.length].id);
        }, INTERVALO_SANFONA);
        return () => clearTimeout(tempo);
    }, [aberto, parado, jogos]);

    if (!jogos.length) return null;

    // um respiro antes de abrir: passar o mouse de raspão não sacode a galeria
    function apontar(id) {
        clearTimeout(espera.current);
        espera.current = setTimeout(() => setAberto(id), 90);
    }

    function abrir(id) {
        clearTimeout(espera.current);
        setAberto(id);
    }

    function teclar(evento) {
        const i = jogos.findIndex((j) => j.id === aberto);
        const alvo = evento.key === "ArrowRight" ? i + 1 : evento.key === "ArrowLeft" ? i - 1 : null;
        if (alvo === null || !jogos[alvo]) return;
        evento.preventDefault();
        abrir(jogos[alvo].id);
        evento.currentTarget.querySelectorAll(".sanfona-gatilho")[alvo]?.focus();
    }

    // paralaxe: a arte do painel aberto acompanha o cursor de leve
    function mover(evento) {
        if (evento.pointerType !== "mouse") return;
        const painel = evento.currentTarget;
        const { clientX, clientY } = evento;
        cancelAnimationFrame(quadro.current);
        quadro.current = requestAnimationFrame(() => {
            const r = painel.getBoundingClientRect();
            painel.style.setProperty("--px", ((clientX - r.left) / r.width - 0.5).toFixed(3));
            painel.style.setProperty("--py", ((clientY - r.top) / r.height - 0.5).toFixed(3));
        });
    }

    return (
        <section ref={secaoRef} className="secao galeria-souls" aria-labelledby="titulo-souls">
            <div className="secao-topo">
                <div>
                    <h2 className="titulo-secao" id="titulo-souls">
                        Soulslike
                    </h2>
                    <p className="descricao-secao">Prepare-se para morrer. E para tentar de novo.</p>
                </div>
                <div className="secao-acoes">
                    <button type="button" className="link-mais" onClick={aoVerTodos}>
                        Ver todos os {jogos.length}
                    </button>
                </div>
            </div>

            <div
                className="sanfona"
                role="group"
                aria-label="Jogos soulslike"
                onKeyDown={teclar}
                onPointerEnter={(e) => e.pointerType === "mouse" && setPausado(true)}
                onPointerLeave={() => setPausado(false)}
                onFocus={() => setPausado(true)}
                onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setPausado(false)}
            >
                {jogos.map((j) => {
                    const imagens = imagensDoJogo(j);
                    const ativo = j.id === aberto;
                    return (
                        <article
                            key={j.id}
                            className={ativo ? "sanfona-painel aberto" : "sanfona-painel"}
                            onPointerEnter={(e) => e.pointerType === "mouse" && apontar(j.id)}
                            onPointerMove={ativo ? mover : undefined}
                        >
                            <Imagem
                                className="sanfona-capa"
                                src={imagens.capaPequena}
                                srcSet={`${imagens.capaPequena} 300w, ${imagens.capa} 600w`}
                                sizes="(max-width: 720px) 78vw, 340px"
                                alternativa={imagens.horizontal}
                                alt=""
                            />
                            {abertos.current.has(j.id) && <Imagem className="sanfona-arte" src={imagens.banner} alternativa={imagens.destaque} alt="" />}

                            <button
                                type="button"
                                className="sanfona-gatilho"
                                onClick={() => (ativo ? abrirJogo(j.id) : abrir(j.id))}
                                onFocus={() => abrir(j.id)}
                                aria-expanded={ativo}
                                aria-label={ativo ? `Abrir ${j.nome}` : `Mostrar ${j.nome}`}
                            />
                            <span className="sanfona-vertical" aria-hidden="true">
                                {j.nome}
                            </span>
                            {j.desconto > 0 && <span className="sanfona-desconto">-{j.desconto}%</span>}

                            <div className="sanfona-info">
                                <span className="sanfona-meta">
                                    {j.desenvolvedora} · {j.lancamento}
                                </span>
                                <h3 className="sanfona-titulo">
                                    <span>{j.nome}</span>
                                </h3>
                                <span className="sanfona-detalhes">
                                    {j.nota != null && <strong>{j.nota.toFixed(1)}</strong>}
                                    {j.generos.filter((g) => g !== "Soulslike").slice(0, 2).join(" · ")}
                                </span>
                                <div className="sanfona-compra">
                                    <Preco jogo={j} />
                                    <div className="sanfona-botoes">
                                        <button type="button" className="botao botao-primario" onClick={() => abrirJogo(j.id)}>
                                            Ver jogo <IconeSeta tamanho={15} />
                                        </button>
                                        <BotaoCarrinho jogo={j} />
                                    </div>
                                </div>
                            </div>

                            {ativo && <span key={chaveTempo} className={parado ? "sanfona-tempo parado" : "sanfona-tempo"} style={{ animationDuration: `${INTERVALO_SANFONA}ms` }} aria-hidden="true" />}
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

/* ==========================================================================
   Resident Evil: os arquivos do surto
   ========================================================================== */

// Cronologia do universo (ordem dos acontecimentos, não de lançamento).
const ARQUIVOS = [
    { id: 46, ano: "1998", local: "Montanhas Arklay · trem Ecliptic Express", agentes: "Rebecca Chambers e Billy Coen", ameaca: "T-Vírus" },
    { id: 51, ano: "1998", local: "Mansão Spencer · Montanhas Arklay", agentes: "Chris Redfield e Jill Valentine", ameaca: "T-Vírus" },
    { id: 40, ano: "1998", local: "Raccoon City", agentes: "Leon S. Kennedy e Claire Redfield", ameaca: "T-Vírus · G-Vírus" },
    { id: 41, ano: "1998", local: "Raccoon City", agentes: "Jill Valentine e Carlos Oliveira", ameaca: "T-Vírus · Nemesis" },
    { id: 39, ano: "2004", local: "Zona rural da Espanha", agentes: "Leon S. Kennedy e Ashley Graham", ameaca: "Las Plagas" },
    { id: 44, ano: "2005", local: "Navio Queen Zenobia · Mar Mediterrâneo", agentes: "Jill Valentine e Parker Luciani", ameaca: "T-Abyss" },
    { id: 42, ano: "2009", local: "Kijuju · África", agentes: "Chris Redfield e Sheva Alomar", ameaca: "Las Plagas · Uroboros" },
    { id: 45, ano: "2011", local: "Ilha no Mar Adriático", agentes: "Claire Redfield, Moira e Barry Burton", ameaca: "T-Phobos" },
    { id: 43, ano: "2013", local: "Tall Oaks · Lanshiang · Edonia", agentes: "Leon, Chris, Jake, Sherry e Ada Wong", ameaca: "C-Vírus" },
    { id: 48, ano: "2017", local: "Dulvey · Louisiana, EUA", agentes: "Ethan Winters", ameaca: "Mofo · E-001 (Eveline)" },
    { id: 16, ano: "2021", local: "Vilarejo na Europa Oriental", agentes: "Ethan Winters", ameaca: "Megamiceto" },
];

const nomeCurto = (nome) => nome.replace(/^Resident Evil\s*/, "") || "Resident Evil";

// Datilografa o texto aos poucos (instantâneo com "reduzir movimento").
function useDatilografia(texto, velocidade = 14) {
    const [quantidade, setQuantidade] = useState(0);

    useEffect(() => {
        setQuantidade(0);
        const intervalo = setInterval(() => {
            setQuantidade((q) => {
                if (q >= texto.length) {
                    clearInterval(intervalo);
                    return q;
                }
                return q + 2;
            });
        }, velocidade);
        return () => clearInterval(intervalo);
    }, [texto, velocidade]);

    return texto.slice(0, quantidade);
}

export function UniversoResidentEvil({ jogos, aoVerTodos }) {
    const { abrirJogo } = useLoja();
    const [secaoRef, acordado, naTela] = useAcordar();
    const arquivos = ARQUIVOS.map((a) => ({ ...a, jogo: jogos.find((j) => j.id === a.id) })).filter((a) => a.jogo);
    const [selecionado, , escolher] = useSelecao(arquivos.find((a) => a.id === 39)?.id ?? arquivos[0]?.id);
    const [comMouse, setComMouse] = useState(false);
    const quadro = useRef(0);
    const linhaRef = useRef(null);
    const indice = Math.max(0, arquivos.findIndex((a) => a.id === selecionado));
    const arquivo = arquivos[indice];
    const relatorio = useDatilografia(arquivo?.jogo.descricao ?? "");

    useEffect(() => () => cancelAnimationFrame(quadro.current), []);

    // Mantém o arquivo selecionado à vista na linha do tempo (rola só a linha, nunca a página).
    const primeiraRolagem = useRef(true);
    useEffect(() => {
        const linha = linhaRef.current;
        const marco = linha?.querySelectorAll(".re-marco")[indice];
        if (!marco || linha.scrollWidth <= linha.clientWidth) return;
        const caixaLinha = linha.getBoundingClientRect();
        const caixaMarco = marco.getBoundingClientRect();
        const alvo = linha.scrollLeft + caixaMarco.left - caixaLinha.left - linha.clientWidth / 2 + caixaMarco.width / 2;
        linha.scrollTo({ left: alvo, behavior: primeiraRolagem.current || semMovimento() ? "auto" : "smooth" });
        primeiraRolagem.current = false;
    }, [indice]);

    if (!arquivo) return null;
    const { jogo } = arquivo;

    // Lanterna: a luz segue o cursor (com inércia via @property no CSS).
    function iluminar(evento) {
        if (evento.pointerType !== "mouse") return;
        if (!comMouse) setComMouse(true);
        const { clientX, clientY } = evento;
        const secao = evento.currentTarget;
        cancelAnimationFrame(quadro.current);
        quadro.current = requestAnimationFrame(() => {
            const r = secao.getBoundingClientRect();
            secao.style.setProperty("--lx", `${clientX - r.left}px`);
            secao.style.setProperty("--ly", `${clientY - r.top}px`);
        });
    }

    function teclar(evento) {
        if (evento.key === "ArrowRight") escolher(arquivos[Math.min(arquivos.length - 1, indice + 1)].id);
        if (evento.key === "ArrowLeft") escolher(arquivos[Math.max(0, indice - 1)].id);
    }

    return (
        <section
            ref={secaoRef}
            className={["re", acordado && "acordado", naTela && "em-tela", comMouse && "com-mouse"].filter(Boolean).join(" ")}
            aria-label="Universo Resident Evil"
            onPointerMove={iluminar}
            onPointerLeave={() => setComMouse(false)}
        >
            <div className="re-fundo" aria-hidden="true">
                <Imagem key={jogo.id} src={imagensDoJogo(jogo).banner} alternativa={jogo.fundo} alt="" />
            </div>
            <div className="re-escuro" aria-hidden="true" />
            <div className="re-varredura" aria-hidden="true" />

            <div className="re-conteudo">
                <header className="re-cabecalho">
                    <span className="re-alerta">
                        <span className="re-sirene" aria-hidden="true" />
                        Arquivos do surto · acesso restrito
                    </span>
                    <h2 className="re-titulo" data-texto="Resident Evil">
                        Resident Evil
                    </h2>
                </header>

                <div className="re-linha" ref={linhaRef} role="group" aria-label="Linha do tempo dos incidentes" onKeyDown={teclar}>
                    <div className="re-linha-faixa" style={{ "--n": arquivos.length, "--progresso": indice / Math.max(1, arquivos.length - 1) }}>
                        <span className="re-linha-trilho" aria-hidden="true">
                            <i />
                        </span>
                    {arquivos.map((a, i) => (
                        <button
                            type="button"
                            key={a.id}
                            className={i === indice ? "re-marco ativo" : i < indice ? "re-marco passado" : "re-marco"}
                            style={{ "--i": i }}
                            onClick={() => escolher(a.id)}
                            aria-pressed={i === indice}
                            aria-label={`${a.jogo.nome}, ${a.ano}`}
                        >
                            <span className="re-marco-ano">{a.ano}</span>
                            <span className="re-marco-ponto" aria-hidden="true" />
                            <span className="re-marco-nome">{nomeCurto(a.jogo.nome)}</span>
                        </button>
                    ))}
                    </div>
                </div>

                <article className="re-dossie" key={jogo.id} aria-live="polite">
                    <div className="re-foto">
                        <span className="re-clipe" aria-hidden="true" />
                        <button type="button" onClick={() => abrirJogo(jogo.id)} aria-label={`Abrir ${jogo.nome}`}>
                            <Imagem src={imagensDoJogo(jogo).capa} srcSet={`${imagensDoJogo(jogo).capaPequena} 300w, ${imagensDoJogo(jogo).capa} 600w`} sizes="(max-width: 720px) 150px, 230px" alternativa={imagensDoJogo(jogo).horizontal} alt="" />
                        </button>
                    </div>

                    <div className="re-ficha">
                        <div className="re-ficha-topo">
                            <span>Arquivo nº {String(indice + 1).padStart(3, "0")}</span>
                            <span className="re-carimbo" aria-hidden="true">
                                Confidencial
                            </span>
                        </div>
                        <h3 className="re-ficha-nome">{jogo.nome}</h3>
                        <dl className="re-campos">
                            <div>
                                <dt>Incidente</dt>
                                <dd>{arquivo.ano}</dd>
                            </div>
                            <div>
                                <dt>Local</dt>
                                <dd>{arquivo.local}</dd>
                            </div>
                            <div>
                                <dt>Agentes</dt>
                                <dd>{arquivo.agentes}</dd>
                            </div>
                            <div>
                                <dt>Ameaça</dt>
                                <dd className="re-ameaca">{arquivo.ameaca}</dd>
                            </div>
                        </dl>
                        <p className="re-relatorio">
                            <span className="re-relatorio-rotulo">Relatório:</span> {relatorio}
                            <span className="re-cursor" aria-hidden="true" />
                        </p>
                        <div className="re-compra">
                            <Preco jogo={jogo} tamanho="grande" />
                            <div className="re-botoes">
                                <button type="button" className="botao botao-primario" onClick={() => abrirJogo(jogo.id)}>
                                    Abrir arquivo <IconeSeta tamanho={15} />
                                </button>
                                <BotaoCarrinho jogo={jogo} />
                            </div>
                        </div>
                    </div>
                </article>

                <div className="re-rodape">
                    <button type="button" className="re-sala" onClick={aoVerTodos}>
                        <span className="re-sala-luz" aria-hidden="true" />
                        Entrar na sala segura
                        <small>Ver os {jogos.length} jogos da franquia</small>
                    </button>
                </div>
            </div>
        </section>
    );
}
