function CardJogo({ imagem, nome, plataforma, nota, preco, desconto }) {
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