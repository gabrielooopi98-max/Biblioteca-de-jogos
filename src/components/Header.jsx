import { navegar, useIndicador } from "../hooks.js";
import { IconeBiblioteca, IconeBusca, IconeBussola, IconeCarrinho, IconeCasa, IconeCoracao, IconeFone, IconeLua, IconeRecibo, IconeSol, LogoMarca } from "./Icones.jsx";

const PAGINAS = [
    { pagina: "loja", caminho: "/", rotulo: "Loja", Icone: IconeCasa },
    { pagina: "explorar", caminho: "/explorar", rotulo: "Explorar", Icone: IconeBussola },
    { pagina: "acessorios", caminho: "/acessorios", rotulo: "Acessórios", Icone: IconeFone },
    { pagina: "biblioteca", caminho: "/biblioteca", rotulo: "Biblioteca", Icone: IconeBiblioteca },
    { pagina: "pedidos", caminho: "/pedidos", rotulo: "Pedidos", Icone: IconeRecibo },
];

const ehMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function Header({ pagina, qtdCarrinho, qtdDesejos, qtdBiblioteca, alertas, abrirCarrinho, abrirPaleta, tema, alternarTema }) {
    const navRef = useIndicador();

    return (
        <>
            <header className="barra">
                <div className="barra-conteudo">
                    <a
                        href="#/"
                        className="logo"
                        onClick={(e) => {
                            e.preventDefault();
                            navegar("/");
                        }}
                        aria-label="Universal Games, página inicial"
                    >
                        <LogoMarca />
                        <span className="logo-texto">
                            Universal<small> Games</small>
                        </span>
                    </a>

                    <nav className="nav" aria-label="Principal" ref={navRef}>
                        {PAGINAS.map((item) => (
                            <a key={item.pagina} href={`#${item.caminho}`} className={pagina === item.pagina ? "ativo" : ""} aria-current={pagina === item.pagina ? "page" : undefined}>
                                {item.rotulo}
                                {item.pagina === "biblioteca" && qtdBiblioteca > 0 && <span className="nav-contagem">{qtdBiblioteca}</span>}
                            </a>
                        ))}
                    </nav>

                    <button type="button" className="busca-gatilho" onClick={abrirPaleta}>
                        <IconeBusca tamanho={16} />
                        <span>Buscar jogos, estúdios, páginas…</span>
                        <kbd>{ehMac ? "⌘" : "Ctrl"} K</kbd>
                    </button>

                    <div className="barra-acoes">
                        <button type="button" className="icone-botao busca-movel" onClick={abrirPaleta} aria-label="Buscar">
                            <IconeBusca tamanho={19} />
                        </button>
                        <button type="button" className="icone-botao" onClick={alternarTema} aria-label={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"} data-dica={tema === "escuro" ? "Tema claro" : "Tema escuro"}>
                            {tema === "escuro" ? <IconeSol tamanho={18} /> : <IconeLua tamanho={18} />}
                        </button>
                        <a href="#/desejos" className={pagina === "desejos" ? "icone-botao ativo" : "icone-botao"} aria-label={`Lista de desejos (${qtdDesejos})`} data-dica="Lista de desejos">
                            <IconeCoracao tamanho={18} />
                            {qtdDesejos > 0 && (
                                <span key={qtdDesejos} className="contagem">
                                    {qtdDesejos}
                                </span>
                            )}
                            {alertas > 0 && <span className="ponto-alerta" title={`${alertas} alerta(s) de preço atingido(s)`} />}
                        </a>
                        <button type="button" className="carrinho-botao" onClick={abrirCarrinho} aria-label={`Carrinho (${qtdCarrinho})`}>
                            <IconeCarrinho tamanho={17} />
                            <span className="carrinho-rotulo">Carrinho</span>
                            <span key={qtdCarrinho} className="carrinho-contagem">
                                {qtdCarrinho}
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            <nav className="abas-moveis" aria-label="Navegação">
                {PAGINAS.slice(0, 2).map(({ pagina: p, caminho, rotulo, Icone }) => (
                    <a key={p} href={`#${caminho}`} className={pagina === p ? "ativo" : ""}>
                        <Icone tamanho={20} />
                        {rotulo}
                    </a>
                ))}
                <button type="button" onClick={abrirPaleta}>
                    <IconeBusca tamanho={20} />
                    Buscar
                </button>
                <a href="#/biblioteca" className={pagina === "biblioteca" ? "ativo" : ""}>
                    <IconeBiblioteca tamanho={20} />
                    Biblioteca
                </a>
                <button type="button" onClick={abrirCarrinho}>
                    <span className="aba-icone">
                        <IconeCarrinho tamanho={20} />
                        {qtdCarrinho > 0 && <span className="contagem">{qtdCarrinho}</span>}
                    </span>
                    Carrinho
                </button>
            </nav>
        </>
    );
}

export default Header;
