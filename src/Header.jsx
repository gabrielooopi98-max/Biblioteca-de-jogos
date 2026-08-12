function Header({ busca, setBusca, jogosFiltrados, painelAberto, setPainelAberto }) {
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

                {mostrarPainel && (
                    <div className="painel-jogos-filtrados" role="listbox" aria-label="Resultados da busca">
                        {jogosFiltrados.length > 0 ? (
                            jogosFiltrados.slice(0, 6).map((jogo) => {
                                const precoFinal = calcularPrecoComDesconto(jogo.preco, jogo.desconto);

                                return (
                                    <button
                                        type="button"
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
                                    </button>
                                );
                            })
                        ) : (
                            <div className="vazio-busca">Nenhum jogo encontrado.</div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}

function calcularPrecoComDesconto(preco, desconto) {
    if (!desconto) return preco;
    return preco - (preco * desconto) / 100;
}

export default Header;