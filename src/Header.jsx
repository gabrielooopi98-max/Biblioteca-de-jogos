function Header({ busca, setBusca, jogosFiltrados, painelAberto, setPainelAberto, totalItensCarrinho, adicionarAoCarrinho, carrinhoAberto, setCarrinhoAberto }) {
    const mostrarPainel = painelAberto && busca.trim().length > 0;

    return (
        <header className="header">
            <div className="lado-esquerdo">

                <h2>Biblioteca De Jogos</h2>
            </div>

            <div className="header-buscar">
                <input
                    type="text"
                    placeholder="Buscar na loja"
                    value={busca}
                    onFocus={() => setPainelAberto(true)}
                    onChange={(e) => {
                        setBusca(e.target.value);
                        setPainelAberto(true);
                    }}
                />

                {busca && (
                    <button
                        type="button"
                        className="btn-limpar-busca"
                        onClick={() => {
                            setBusca("");
                            setPainelAberto(false);
                        }}
                        aria-label="Limpar busca"
                    >
                        x  
                    </button>    
                )}

                {mostrarPainel && (
                    <div className="painel-jogos-filtrados" role="listbox" aria-label="Resultados da busca">
                        {jogosFiltrados.length > 0 ? (
                            jogosFiltrados.slice(0, 6).map((jogo) => {
                                const precoFinal = calcularPrecoComDesconto(jogo.preco, jogo.desconto);

                                return (
                                    <div
                                        key={jogo.id}
                                        className="item-jogo-busca"
                                        onClick={() => setBusca(jogo.nome)}
                                    >
                                        <img src={jogo.imagem} alt={jogo.nome} />

                                        <div className="info-jogo-busca">
                                            <span className="nome-jogo-busca">{jogo.nome}</span>
                                            <div className="plataformas-jogo-busca">
                                                {jogo.plataforma.split(",").map((plataforma, index) => (
                                                    <span key={index} className="etiqueta-plataforma-busca">
                                                        {plataforma.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="preco-jogo-busca">
                                            {jogo.desconto > 0 && (
                                                <>
                                                    <span className="desconto-busca">-{jogo.desconto}%</span>
                                                    <span className="preco-original-busca">R$ {jogo.preco.toFixed(2)}</span>
                                                </>
                                            )}
                                            <span className="preco-final-busca">R$ {precoFinal.toFixed(2)}</span>
                                        </div>

                                        <div className="area-interativa-busca">
                                            <button className="btn-carrinho-busca"
                                                onClick={(evento) => {
                                                    evento.stopPropagation();
                                                    adicionarAoCarrinho(jogo);
                                                }}
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <circle cx="9" cy="20" r="1" />
                                                    <circle cx="19" cy="20" r="1" />
                                                    <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
                                                </svg>

                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="vazio-busca">Nenhum jogo encontrado.</div>
                        )}
                    </div>
                )}
            </div>


            <button
                type="button"
                className="botao-carrinho-header"
                onClick={() => setCarrinhoAberto(!carrinhoAberto)}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>

                {totalItensCarrinho > 0 && (
                    <span className="badge-carrinho-header">{totalItensCarrinho}</span>
                )}
            </button>
        </header>
    );
}

function calcularPrecoComDesconto(preco, desconto) {
    if (!desconto) return preco;
    return preco - (preco * desconto) / 100;
}

export default Header;