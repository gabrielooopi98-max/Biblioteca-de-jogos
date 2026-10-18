import { useCallback, useEffect, useRef, useState } from "react";
import { navegar, useContagemRegressiva } from "../hooks.js";
import { useLoja } from "../LojaContext.js";
import { calcularPrecoFinal, DIAS_REEMBOLSO, fimDoMes, formatarPreco, imagensDoJogo, nomeDoMes } from "../utils.js";
import CardJogo, { Imagem, Preco } from "./CardJogo.jsx";
import { IconeCadeado, IconeDesfazer, IconeEscudo, IconeRaio, IconeSeta, IconeSetaDireita, IconeSetaEsquerda, LogoMarca } from "./Icones.jsx";

export function Contador() {
    const { dias, horas, minutos, segundos } = useContagemRegressiva(fimDoMes());
    const dois = (n) => String(n).padStart(2, "0");

    return (
        <span className="contador" role="timer">
            {dias > 0 && `${dias}d `}
            {dois(horas)}:{dois(minutos)}:{dois(segundos)}
        </span>
    );
}

export function CabecalhoSecao({ titulo, descricao, children }) {
    return (
        <div className="secao-topo">
            <div>
                <h2 className="titulo-secao">{titulo}</h2>
                {descricao && <p className="descricao-secao">{descricao}</p>}
            </div>
            {children && <div className="secao-acoes">{children}</div>}
        </div>
    );
}

const ESPACO_TRILHO = 14;

export function Prateleira({ id, titulo, descricao, jogos, aoVerMais }) {
    const corpoRef = useRef(null);
    const trilhoRef = useRef(null);
    const [estado, setEstado] = useState({ inicio: true, fim: true, pagina: 0, paginas: 1 });

    const medir = useCallback(() => {
        const trilho = trilhoRef.current;
        if (!trilho) return;
        const maximo = trilho.scrollWidth - trilho.clientWidth;
        const passo = trilho.clientWidth + ESPACO_TRILHO;
        const paginas = Math.max(1, Math.ceil((trilho.scrollWidth + ESPACO_TRILHO) / passo - 0.02));
        const fim = trilho.scrollLeft >= maximo - 4;
        const pagina = fim ? paginas - 1 : Math.round(trilho.scrollLeft / passo);
        setEstado((atual) =>
            atual.inicio === trilho.scrollLeft <= 4 && atual.fim === fim && atual.pagina === pagina && atual.paginas === paginas
                ? atual
                : { inicio: trilho.scrollLeft <= 4, fim, pagina, paginas },
        );
        // As setas ficam centralizadas na arte dos cards, não no card inteiro.
        const arte = trilho.querySelector(".cartao-imagem");
        if (arte) corpoRef.current.style.setProperty("--altura-arte", `${arte.offsetHeight}px`);
    }, []);

    useEffect(() => {
        medir();
        const observador = new ResizeObserver(medir);
        observador.observe(trilhoRef.current);
        return () => observador.disconnect();
    }, [medir, jogos.length]);

    const passo = () => trilhoRef.current.clientWidth + ESPACO_TRILHO;
    const rolar = (direcao) => trilhoRef.current.scrollBy({ left: direcao * passo(), behavior: "smooth" });
    const irParaPagina = (pagina) => trilhoRef.current.scrollTo({ left: pagina * passo(), behavior: "smooth" });

    const classes = ["prateleira-corpo", estado.inicio && "no-inicio", estado.fim && "no-fim"].filter(Boolean).join(" ");

    return (
        <section className="secao prateleira" id={id}>
            <CabecalhoSecao titulo={titulo} descricao={descricao}>
                {estado.paginas > 1 && (
                    <div className="prateleira-paginas">
                        {Array.from({ length: estado.paginas }, (_, i) => (
                            <button
                                type="button"
                                key={i}
                                className={i === estado.pagina ? "ativa" : ""}
                                onClick={() => irParaPagina(i)}
                                aria-label={`Página ${i + 1} de ${estado.paginas}`}
                                aria-current={i === estado.pagina}
                            />
                        ))}
                    </div>
                )}
                {aoVerMais && (
                    <button type="button" className="link-mais" onClick={aoVerMais}>
                        Ver tudo
                    </button>
                )}
            </CabecalhoSecao>
            <div className={classes} ref={corpoRef}>
                <button type="button" className="prateleira-seta esquerda" onClick={() => rolar(-1)} disabled={estado.inicio} aria-label="Jogos anteriores">
                    <IconeSetaEsquerda tamanho={22} />
                </button>
                <div className="trilho" ref={trilhoRef} onScroll={medir}>
                    {jogos.map((jogo) => (
                        <CardJogo key={jogo.id} jogo={jogo} />
                    ))}
                </div>
                <button type="button" className="prateleira-seta direita" onClick={() => rolar(1)} disabled={estado.fim} aria-label="Próximos jogos">
                    <IconeSetaDireita tamanho={22} />
                </button>
            </div>
        </section>
    );
}

const GARANTIAS = [
    { Icone: IconeRaio, titulo: "Entrega instantânea", texto: "Chave liberada assim que o pagamento é aprovado" },
    { Icone: IconeEscudo, titulo: "Chaves oficiais", texto: "Ativação garantida na plataforma indicada" },
    { Icone: IconeDesfazer, titulo: `Reembolso em ${DIAS_REEMBOLSO} dias`, texto: "Direito de arrependimento, direto em Meus pedidos" },
    { Icone: IconeCadeado, titulo: "Pix, cartão ou boleto", texto: "Até 10x sem juros ou 5% de desconto no Pix" },
];

export function Garantias() {
    return (
        <section className="garantias" aria-label="Garantias da loja">
            {GARANTIAS.map(({ Icone, titulo, texto }) => (
                <div key={titulo} className="garantia">
                    <Icone tamanho={18} />
                    <div>
                        <strong>{titulo}</strong>
                        <span>{texto}</span>
                    </div>
                </div>
            ))}
        </section>
    );
}

export function Ofertas({ jogos, aoVerMais }) {
    const { abrirJogo } = useLoja();

    return (
        <section className="secao" id="ofertas">
            <CabecalhoSecao titulo="Ofertas" descricao={<>Encerram em <Contador /></>}>
                <button type="button" className="link-mais" onClick={aoVerMais}>
                    Ver todas
                </button>
            </CabecalhoSecao>
            <div className="ofertas">
                {jogos.map((jogo, indice) => {
                    const imagens = imagensDoJogo(jogo);
                    const grande = indice === 0;
                    return (
                        <button type="button" key={jogo.id} className={grande ? "oferta oferta-grande" : "oferta"} onClick={() => abrirJogo(jogo.id)}>
                            <span className="oferta-imagem">
                                {/* Na oferta grande a arte aparece inteira, sobre uma cópia desfocada. */}
                                {grande && <Imagem src={imagens.destaque} alternativa={imagens.horizontal} alt="" className="arte-fundo" aria-hidden="true" />}
                                <Imagem src={grande ? imagens.destaque : imagens.horizontal} alternativa={imagens.horizontal} alt="" className={grande ? "arte" : ""} />
                            </span>
                            <span className="oferta-info">
                                <span className="oferta-nome">{jogo.nome}</span>
                                <Preco jogo={jogo} tamanho={grande ? "grande" : "medio"} />
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

export function Categorias({ categorias, aoEscolher }) {
    return (
        <section className="secao" id="categorias">
            <CabecalhoSecao titulo="Categorias" />
            <div className="categorias">
                {categorias.map(({ nome, jogo, quantidade }) => (
                    <button key={nome} type="button" className="categoria" onClick={() => aoEscolher(nome)}>
                        <Imagem src={imagensDoJogo(jogo).destaque} alternativa={imagensDoJogo(jogo).horizontal} alt="" />
                        <span className="categoria-texto">
                            <strong>{nome}</strong>
                            <small>{quantidade} jogos</small>
                        </span>
                        <IconeSeta tamanho={16} className="categoria-seta" />
                    </button>
                ))}
            </div>
        </section>
    );
}

export function BannerPromocao({ jogos, fundo, aoClicar }) {
    const { abrirJogo } = useLoja();
    const descontoMaximo = Math.max(...jogos.map((j) => j.desconto));

    return (
        <section className="evento">
            <img className="evento-fundo" src={imagensDoJogo(fundo).banner} alt="" loading="lazy" />
            <div className="evento-texto">
                <span className="rotulo">Evento · {nomeDoMes()}</span>
                <h2>Até {descontoMaximo}% off nos maiores sucessos</h2>
                <p>
                    Termina em <Contador />
                </p>
                <button type="button" className="botao botao-primario" onClick={aoClicar}>
                    Ver ofertas
                </button>
            </div>
            <div className="evento-jogos">
                {jogos.map((jogo) => (
                    <button key={jogo.id} type="button" className="evento-jogo" onClick={() => abrirJogo(jogo.id)}>
                        <Imagem src={imagensDoJogo(jogo).capaPequena} alternativa={imagensDoJogo(jogo).horizontal} alt={jogo.nome} />
                        <span className="preco-desconto">-{jogo.desconto}%</span>
                    </button>
                ))}
            </div>
        </section>
    );
}

export function BannerColecao({ jogo, jogos, titulo, aoClicar }) {
    const { abrirJogo } = useLoja();
    const menorPreco = Math.min(...jogos.map(calcularPrecoFinal));
    const capas = [...jogos].sort((a, b) => b.nota - a.nota).slice(0, 6);

    return (
        <section className="secao">
            <div className="franquia">
                <img className="franquia-fundo" src={imagensDoJogo(jogo).banner} alt="" loading="lazy" />
                <div className="franquia-texto">
                    <span className="rotulo">Franquia · {jogos.length} jogos</span>
                    <h2>{titulo}</h2>
                    <p>
                        A partir de <strong>{formatarPreco(menorPreco)}</strong>
                    </p>
                    <button type="button" className="botao botao-secundario" onClick={aoClicar}>
                        Ver franquia <IconeSeta tamanho={15} />
                    </button>
                </div>
                <div className="franquia-jogos">
                    {capas.map((item) => (
                        <button key={item.id} type="button" onClick={() => abrirJogo(item.id)} title={item.nome}>
                            <Imagem src={imagensDoJogo(item).capaPequena} alternativa={imagensDoJogo(item).horizontal} alt={item.nome} />
                            <Preco jogo={item} tamanho="pequeno" />
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function ChamadaCatalogo({ total }) {
    return (
        <section className="chamada">
            <div>
                <h2>Ainda procurando?</h2>
                <p>Filtre os {total} jogos do catálogo por gênero, plataforma, preço e avaliação.</p>
            </div>
            <button type="button" className="botao botao-primario" onClick={() => navegar("/explorar")}>
                Explorar catálogo <IconeSeta tamanho={15} />
            </button>
        </section>
    );
}

const COLUNAS_RODAPE = [
    { titulo: "Loja", links: [["Início", "/"], ["Explorar", "/explorar"], ["Comparar jogos", "/comparar"]] },
    { titulo: "Sua conta", links: [["Biblioteca", "/biblioteca"], ["Pedidos e reembolsos", "/pedidos"], ["Lista de desejos", "/desejos"]] },
];

export function Rodape() {
    return (
        <footer className="rodape">
            <div className="rodape-conteudo">
                <div className="rodape-marca">
                    <a href="#/" className="logo" aria-label="Biblioteca.jogos, voltar para a loja">
                        <LogoMarca />
                        <span className="logo-texto">
                            Biblioteca<small>.jogos</small>
                        </span>
                    </a>
                    <p>Jogos digitais para PC e consoles, com entrega instantânea e reembolso em até {DIAS_REEMBOLSO} dias.</p>
                </div>
                {COLUNAS_RODAPE.map((coluna) => (
                    <nav key={coluna.titulo} className="rodape-coluna" aria-label={coluna.titulo}>
                        <h3>{coluna.titulo}</h3>
                        {coluna.links.map(([rotulo, caminho]) => (
                            <a key={caminho} href={`#${caminho}`}>
                                {rotulo}
                            </a>
                        ))}
                    </nav>
                ))}
                <div className="rodape-coluna">
                    <h3>Atalhos</h3>
                    <span>
                        <kbd>Ctrl</kbd> <kbd>K</kbd> buscar
                    </span>
                    <span>
                        <kbd>/</kbd> buscar
                    </span>
                </div>
            </div>
            <div className="rodape-base">
                <span>© {new Date().getFullYear()} Biblioteca.jogos. Projeto demonstrativo: nenhum pagamento real é processado.</span>
                <span>Marcas e imagens pertencem aos seus respectivos donos.</span>
            </div>
        </footer>
    );
}
