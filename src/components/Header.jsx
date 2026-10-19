import { navegar, useIndicador } from "../hooks.js";
import { IconeBusca, IconeBussola, IconeCarrinho, IconeCasa, IconeCoracao, IconeFone, IconeRecibo, LogoMarca } from "./Icones.jsx";

const PAGINAS = [
    { pagina: "loja", caminho: "/", rotulo: "Loja", Icone: IconeCasa },
    { pagina: "explorar", caminho: "/explorar", rotulo: "Jogos", Icone: IconeBussola },
    { pagina: "acessorios", caminho: "/acessorios", rotulo: "Produtos", Icone: IconeFone },
    { pagina: "reservas", caminho: "/reservas", rotulo: "Reservas", Icone: IconeRecibo },
];

const ehMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function Header({ pagina, qtdCarrinho, qtdDesejos, qtdReservas, alertas, abrirCarrinho, abrirPaleta }) {
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
                                {item.pagina === "reservas" && qtdReservas > 0 && <span className="nav-contagem">{qtdReservas}</span>}
                            </a>
                        ))}
                    </nav>

                    <button type="button" className="busca-gatilho" onClick={abrirPaleta}>
                        <IconeBusca tamanho={16} />
                        <span>Buscar jogos, produtos, páginas…</span>
                        <kbd>{ehMac ? "⌘" : "Ctrl"} K</kbd>
                    </button>

                    <div className="barra-acoes">
                        <button type="button" className="icone-botao busca-movel" onClick={abrirPaleta} aria-label="Buscar">
                            <IconeBusca tamanho={19} />
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
                <a href="#/reservas" className={pagina === "reservas" ? "ativo" : ""}>
                    <span className="aba-icone">
                        <IconeRecibo tamanho={20} />
                        {qtdReservas > 0 && <span className="contagem">{qtdReservas}</span>}
                    </span>
                    Reservas
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
