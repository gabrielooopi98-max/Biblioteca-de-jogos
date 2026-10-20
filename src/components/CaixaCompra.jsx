// Caixa de compra das páginas de jogo e de produto: situação do estoque, preço (com Pix e parcelas),
// botões de reserva e as condições de retirada, numa ordem só para as duas páginas.
import { useLoja } from "../LojaContext.js";
import { calcularParcelas, calcularPrecoFinal, DESCONTO_PIX, DIAS_PARA_RETIRAR, formatarPreco, GARANTIA_MESES, LOJA } from "../utils.js";
import { IconeCarrinho, IconeCheck, IconeComparar, IconeCoracao, IconeDesfazer, IconeEscudo, IconeLoja, IconePix } from "./Icones.jsx";

function Situacao({ item }) {
    if (item.esgotado) return <span className="caixa-situacao esgotado">Esgotado no momento</span>;
    if (item.estoque != null && item.estoque <= 3) return <span className="caixa-situacao poucos">{item.estoque === 1 ? "Última unidade na loja" : `Últimas ${item.estoque} unidades na loja`}</span>;
    return <span className="caixa-situacao">Disponível para reserva</span>;
}

export default function CaixaCompra({ item, comprarAgora, plataformas, extras = true, children }) {
    const { adicionarAoCarrinho, alternarDesejo, estaNoCarrinho, estaNosDesejos, alternarComparar, estaComparando } = useLoja();
    const final = calcularPrecoFinal(item);
    const parcelas = calcularParcelas(final);
    const noCarrinho = estaNoCarrinho(item.id);
    const desejado = estaNosDesejos(item.id);
    const comparando = estaComparando(item.id);

    return (
        <div className="caixa-compra">
            {children}
            <Situacao item={item} />

            <div className="caixa-preco">
                {item.desconto > 0 && (
                    <span className="caixa-de">
                        <s>{formatarPreco(item.preco)}</s>
                        <span className="preco-desconto">-{item.desconto}%</span>
                    </span>
                )}
                <strong className="caixa-valor">{formatarPreco(final)}</strong>
                <span className="caixa-parcelas">
                    em até {parcelas.quantidade}x de {formatarPreco(parcelas.valor)} sem juros
                </span>
            </div>

            <div className="caixa-pix">
                <IconePix tamanho={18} />
                <span>
                    <span>
                        <strong>{formatarPreco(final * (1 - DESCONTO_PIX / 100))}</strong> no Pix
                    </span>
                    <small>{DESCONTO_PIX}% de desconto à vista</small>
                </span>
            </div>

            {item.desconto > 0 && <span className="caixa-economia">Você economiza {formatarPreco(item.preco - final)}</span>}

            {plataformas?.length > 0 && (
                <div className="caixa-plataformas">
                    <span>Disponível para</span>
                    <div>
                        {plataformas.map((p) => (
                            <span key={p} className="caixa-plataforma">
                                {p}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="caixa-botoes">
                <button type="button" className="botao botao-cheio botao-grande botao-largo" onClick={() => comprarAgora(item)} disabled={item.esgotado}>
                    {item.esgotado ? "Esgotado" : "Reservar agora"}
                </button>
                <button type="button" className={noCarrinho ? "botao botao-secundario botao-grande botao-largo ativo" : "botao botao-secundario botao-grande botao-largo"} onClick={() => adicionarAoCarrinho(item)} disabled={item.esgotado}>
                    {noCarrinho ? <IconeCheck tamanho={16} /> : <IconeCarrinho tamanho={16} />}
                    {noCarrinho ? "No carrinho" : "Adicionar ao carrinho"}
                </button>
                {extras && (
                    <div className="caixa-secundarias">
                        <button type="button" className={desejado ? "botao botao-fantasma ativo" : "botao botao-fantasma"} onClick={() => alternarDesejo(item)} aria-pressed={desejado}>
                            <IconeCoracao tamanho={15} preenchido={desejado} /> {desejado ? "Na lista de desejos" : "Desejar"}
                        </button>
                        <button type="button" className={comparando ? "botao botao-fantasma ativo" : "botao botao-fantasma"} onClick={() => alternarComparar(item)} aria-pressed={comparando}>
                            <IconeComparar tamanho={15} /> {comparando ? "Comparando" : "Comparar"}
                        </button>
                    </div>
                )}
            </div>

            <ul className="caixa-garantias">
                <li>
                    <IconeLoja tamanho={17} />
                    <span>
                        <strong>Retire na loja</strong> em até {DIAS_PARA_RETIRAR} dias após a confirmação
                        <small>{LOJA.endereco}</small>
                    </span>
                </li>
                <li>
                    <IconeEscudo tamanho={17} />
                    <span>
                        <strong>Original e lacrado</strong>, com garantia de {GARANTIA_MESES} meses
                        <small>Troca em até 7 dias se não gostar</small>
                    </span>
                </li>
                <li>
                    <IconeDesfazer tamanho={17} />
                    <span>
                        <strong>Sem compromisso</strong>: cancele antes de retirar
                        <small>Valor pago pelo site é devolvido</small>
                    </span>
                </li>
            </ul>
        </div>
    );
}
