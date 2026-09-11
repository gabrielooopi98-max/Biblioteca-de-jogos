function CardJogo({ jogo, adicionarAoCarrinho, jaNoCarrinho }) {
    const { imagem, nome, plataforma, nota, preco, desconto } = jogo;

    const precoFinal = calcularPrecoComDesconto(preco, desconto);
    const plataformas = plataforma.split(",").map((item) => item.trim());

    return (
        <article className="card-jogo">
            <div className="card-jogo-imagem">
                <img src={imagem} alt={nome} />
            </div>

            <h3 className="card-jogo-nome">{nome}</h3>

            <div className="card-jogo-plataformas">
                {plataformas.map((item, index) => (
                    <span key={`${item}-${index}`} className="badge-plataforma">
                        {item}
                    </span>
                ))}
            </div>

            <div className="card-jogo-info">
                <div className="card-jogo-topo">
                    <span className={`card-jogo-nota ${corDaNota(nota)}`}>{nota.toFixed(1)}</span>

                    <div className="card-jogo-area-precos">
                        {desconto > 0 && (
                            <>
                                <span className="badge-desconto">-{desconto}%</span>
                                <span className="card-jogo-preco">R$ {preco.toFixed(2)}</span>
                            </>
                        )}
                        <span className="card-jogo-preco-final">R$ {precoFinal.toFixed(2)}</span>
                    </div>
                </div>

                <div className="card-jogo-area-interativa">
                    <button
                        type="button"
                        className={jaNoCarrinho ? "btn-carrinho-card ativo" : "btn-carrinho-card"}
                        onClick={() => adicionarAoCarrinho(jogo)}
                        disabled={jaNoCarrinho}
                        aria-label={jaNoCarrinho ? `${jogo.nome} já está no carrinho` : `Adicionar ${jogo.nome} ao carrinho`}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="9" cy="20" r="1" fill="currentColor" stroke="none" />
                            <circle cx="18.5" cy="20" r="1" fill="currentColor" stroke="none" />
                            <path d="M3 4h2l2.1 9.2a1.8 1.8 0 0 0 1.8 1.5h8.6a1.8 1.8 0 0 0 1.8-1.4L20.5 7H6.5" />
                            <path d="M12 8.5v4.5M9.5 11h5" />
                        </svg>
                        {jaNoCarrinho ? "No carrinho" : "Carrinho"}
                    </button>
                </div>
            </div>
        </article>
    );
}

export default CardJogo;

function corDaNota(nota) {
    if (nota >= 7.5) return "nota-alta";
    if (nota >= 6) return "nota-media";
    return "nota-baixa";
}

function calcularPrecoComDesconto(preco, desconto) {
    if (!desconto) return preco;
    return preco - (preco * desconto) / 100;
}