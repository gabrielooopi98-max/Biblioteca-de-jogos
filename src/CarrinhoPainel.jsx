function CarrinhoPainel({ carrinho, totalPrecoCarrinho, removerJogoCarrinho, fecharPainelCarrinho, carrinhoAberto }) {
    return (
        <>
            <div
                className={`overlay-carrinho ${!carrinhoAberto ? "fechando" : ""}`}
                onClick={fecharPainelCarrinho}
            ></div>

            <aside className={`painel-carrinho ${!carrinhoAberto ? "fechando" : ""}`}>
                <div className="cabecalho-painel-carrinho">
                    <h2>Meu Carrinho</h2>
                    <button type="button" className="btn-fechar-painel-carrinho" onClick={fecharPainelCarrinho} aria-label="Fechar carrinho">X</button>
                </div>

                {carrinho.length === 0 ? (
                    <p className="msg-carrinho-vazio">Seu Carrinho Está Vazio</p>
                ) : (
                    <>
                        <div className="jogos-carrinho">
                            {carrinho.map((jogo) => (
                                <div key={jogo.id} className="jogo-carrinho">

                                    <div className="area-info-jogo-carrinho">
                                        <div className="area-img-jogo-carrinho">
                                            <img src={jogo.imagem} alt={jogo.nome} />
                                        </div>

                                        <span className="nome-jogo-carrinho">{jogo.nome}</span>

                                        <div className="card-jogo-plataformas-carrinho">
                                            {jogo.plataforma.split(",").map((plataforma) => (
                                                <span key={plataforma.trim()} className="badge-plataforma">
                                                    {plataforma.trim()}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="card-jogo-area-precos-carrinho">
                                            {jogo.desconto > 0 && (
                                                <>
                                                    <span className="badge-desconto-carrinho">-{jogo.desconto}%</span>
                                                    <span className="card-jogo-preco-carrinho">R$ {jogo.preco.toFixed(2)}</span>
                                                </>
                                            )}
                                            <span className="card-jogo-preco-final-carrinho">R$ {calcularPrecoComDesconto(jogo.preco, jogo.desconto).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <button type="button" className="btn-remover-jogo-carrinho" onClick={() => removerJogoCarrinho(jogo.id)} aria-label={`Remover ${jogo.nome}`}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M3 6h18" />
                                            <path d="M8 6V4h8v2" />
                                            <path d="M19 6l-1 14H6L5 6" />
                                            <path d="M10 11v5" />
                                            <path d="M14 11v5" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="rodape-painel-carrinho">
                            <div className="total-carrinho">
                                <span>Total :</span>
                                <strong>R$ {totalPrecoCarrinho.toFixed(2)}</strong>
                            </div>
                            <button type="button" className="btn-finalizar-compra">Finalizar Compra</button>
                        </div>
                    </>
                )}
            </aside>
        </>
    )
}

function calcularPrecoComDesconto(preco, desconto) {
    return preco * (1 - (desconto || 0) / 100);
}

export default CarrinhoPainel