import { useState } from "react";
import { navegar } from "../hooks.js";
import { useLoja } from "../LojaContext.js";
import { baixarArquivo, DIAS_REEMBOLSO, ehAcessorio, formatarData, formatarPreco, imagensDoJogo, prazoReembolso } from "../utils.js";
import { IconeCaminhao, IconeDesfazer, IconeDownload, IconePresente, IconeRecibo } from "./Icones.jsx";

const enderecoEmLinha = (e) => `${e.rua}, ${e.numero}${e.complemento ? ` (${e.complemento})` : ""} · ${e.bairro} · ${e.cidade}/${e.uf} · CEP ${e.cep}`;

// Situação da entrega pela data (demonstração): separando, a caminho e entregue.
function situacaoEntrega(pedido) {
    const agora = Date.now();
    const fim = new Date(pedido.entrega.previsao[1]).getTime();
    if (pedido.status !== "pago") return "Cancelada";
    if (agora >= fim) return "Entregue";
    if (agora - new Date(pedido.data).getTime() > 86400000) return "A caminho";
    return "Em separação";
}

const METODOS = { pix: "Pix", cartao: "Cartão de crédito", boleto: "Boleto" };

function comprovante(pedido) {
    const linhas = [
        "UNIVERSAL GAMES · COMPROVANTE DE PEDIDO",
        "(projeto demonstrativo: nenhum pagamento real foi processado)",
        "",
        `Pedido: ${pedido.numero}`,
        `Data: ${formatarData(pedido.data, true)}`,
        `Status: ${pedido.status === "pago" ? "Pago" : "Reembolsado"}`,
        `Comprador: ${pedido.comprador.nome} <${pedido.comprador.email}>`,
        pedido.presente ? `Presente para: ${pedido.presente.nome} <${pedido.presente.email}>` : null,
        `Pagamento: ${METODOS[pedido.metodo]}`,
        pedido.entrega ? `Entrega: ${enderecoEmLinha(pedido.entrega.endereco)}` : null,
        pedido.entrega ? `Previsão: ${formatarData(pedido.entrega.previsao[0])} a ${formatarData(pedido.entrega.previsao[1])}` : null,
        "",
        "Itens:",
        ...pedido.itens.map((item) => `  - ${item.nome}: ${formatarPreco(item.pago)}`),
        "",
        `Subtotal: ${formatarPreco(pedido.resumo.subtotal)}`,
        `Descontos: -${formatarPreco(pedido.resumo.descontos)}`,
        pedido.resumo.valorCupom ? `Cupom ${pedido.cupom}: -${formatarPreco(pedido.resumo.valorCupom)}` : null,
        pedido.resumo.valorPix ? `Desconto Pix: -${formatarPreco(pedido.resumo.valorPix)}` : null,
        pedido.entrega ? `Frete: ${pedido.resumo.frete ? formatarPreco(pedido.resumo.frete) : "Grátis"}` : null,
        `Total: ${formatarPreco(pedido.resumo.total)}`,
    ];
    return linhas.filter((linha) => linha !== null).join("\n");
}

function Pedido({ pedido }) {
    const { reembolsar } = useLoja();
    const [confirmando, setConfirmando] = useState(false);
    const { limite, dentro } = prazoReembolso(pedido);

    return (
        <article className={`pedido ${pedido.status}`}>
            <header className="pedido-topo">
                <div>
                    <strong className="pedido-numero">{pedido.numero}</strong>
                    <span>
                        {formatarData(pedido.data, true)} · {METODOS[pedido.metodo]}
                    </span>
                </div>
                <span className={`status status-${pedido.status}`}>{pedido.status === "pago" ? (pedido.presente ? "Presente enviado" : "Pago") : "Reembolsado"}</span>
            </header>

            {pedido.presente && (
                <p className="pedido-presente">
                    <IconePresente tamanho={15} /> Presente para <strong>{pedido.presente.nome}</strong> ({pedido.presente.email})
                    {pedido.presente.mensagem && <em>“{pedido.presente.mensagem}”</em>}
                </p>
            )}

            {pedido.entrega && (
                <div className="pedido-entrega">
                    <IconeCaminhao tamanho={16} />
                    <div>
                        <strong>
                            {situacaoEntrega(pedido)} · previsão {formatarData(pedido.entrega.previsao[0])} a {formatarData(pedido.entrega.previsao[1])}
                        </strong>
                        <span>{enderecoEmLinha(pedido.entrega.endereco)}</span>
                    </div>
                </div>
            )}

            <ul className="pedido-itens">
                {pedido.itens.map((item) => (
                    <li key={item.id}>
                        <img src={imagensDoJogo(item).horizontal} alt="" loading="lazy" />
                        <span>
                            {item.nome}
                            {ehAcessorio(item) && <small className="pedido-item-tipo">Acessório · entrega em casa</small>}
                        </span>
                        <span className="mono">{formatarPreco(item.pago)}</span>
                    </li>
                ))}
            </ul>

            <footer className="pedido-rodape">
                <div className="pedido-total">
                    <span>Total</span>
                    <strong className="mono">{formatarPreco(pedido.resumo.total)}</strong>
                </div>
                <div className="pedido-acoes">
                    <button type="button" className="botao botao-fantasma" onClick={() => baixarArquivo(`comprovante-${pedido.numero}.txt`, comprovante(pedido))}>
                        <IconeDownload tamanho={15} /> Comprovante
                    </button>
                    {dentro &&
                        (confirmando ? (
                            <span className="confirmacao">
                                {pedido.entrega ? "Cancelar o pedido e reembolsar?" : `Reembolsar e remover ${pedido.itens.length > 1 ? "os jogos" : "o jogo"}?`}
                                <button type="button" className="botao botao-secundario" onClick={() => setConfirmando(false)}>
                                    Cancelar
                                </button>
                                <button type="button" className="botao botao-perigo" onClick={() => reembolsar(pedido.numero)}>
                                    Confirmar
                                </button>
                            </span>
                        ) : (
                            <button type="button" className="botao botao-secundario" onClick={() => setConfirmando(true)}>
                                <IconeDesfazer tamanho={15} /> Solicitar reembolso
                            </button>
                        ))}
                </div>
            </footer>
            {dentro && <p className="pedido-prazo">Reembolso disponível até {formatarData(new Date(limite).toISOString(), true)}.</p>}
        </article>
    );
}

function Pedidos({ pedidos }) {
    const totalGasto = pedidos.filter((p) => p.status === "pago").reduce((soma, p) => soma + p.resumo.total, 0);

    return (
        <div className="pagina">
            <div className="pagina-cabecalho">
                <div>
                    <h1>Pedidos</h1>
                    <p>Histórico de compras, comprovantes e reembolsos em até {DIAS_REEMBOLSO} dias.</p>
                </div>
            </div>
            {pedidos.length === 0 ? (
                <div className="vazio">
                    <IconeRecibo tamanho={30} />
                    <h3>Nenhum pedido ainda</h3>
                    <p>Quando você finalizar uma compra, o pedido aparece aqui.</p>
                    <button type="button" className="botao botao-primario" onClick={() => navegar("/explorar")}>
                        Explorar jogos
                    </button>
                </div>
            ) : (
                <>
                    <div className="estatisticas">
                        <div>
                            <span>Pedidos</span>
                            <strong>{pedidos.length}</strong>
                        </div>
                        <div>
                            <span>Total gasto</span>
                            <strong>{formatarPreco(totalGasto)}</strong>
                        </div>
                        <div>
                            <span>Reembolsados</span>
                            <strong>{pedidos.filter((p) => p.status === "reembolsado").length}</strong>
                        </div>
                    </div>
                    <div className="lista-pedidos">
                        {pedidos.map((pedido) => (
                            <Pedido key={pedido.numero} pedido={pedido} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default Pedidos;
