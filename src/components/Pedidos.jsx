import { useState } from "react";
import { navegar } from "../hooks.js";
import { useLoja } from "../LojaContext.js";
import { baixarArquivo, ehAcessorio, formatarData, formatarPreco, imagensDoJogo, LOJA, pagaNaLoja, podeCancelar, situacaoReserva } from "../utils.js";
import { IconeCheck, IconeDesfazer, IconeDownload, IconeRecibo, IconeRelogio } from "./Icones.jsx";
import { InfoRetirada } from "./Retirada.jsx";

const METODOS = { pix: "Pix", cartao: "Cartão de crédito", boleto: "Boleto", loja: "Pagar na loja" };

function comprovante(pedido) {
    const situacao = situacaoReserva(pedido);
    const { comprador } = pedido;
    const linhas = [
        "UNIVERSAL GAMES · COMPROVANTE DE RESERVA",
        "(projeto demonstrativo: nenhum pagamento real foi processado)",
        "",
        `Pedido: ${pedido.numero}`,
        `Data: ${formatarData(pedido.data, true)}`,
        `Situação: ${situacao.rotulo}`,
        `Cliente: ${comprador.nome} <${comprador.email}>${comprador.telefone ? ` · ${comprador.telefone}` : ""}`,
        `Pagamento: ${METODOS[pedido.metodo]}${pagaNaLoja(pedido) ? " (pago no balcão, na retirada)" : ""}`,
        `Retirada: ${LOJA.nome} · ${LOJA.endereco}`,
        pedido.retirada ? `Código de retirada: ${pedido.retirada.codigo}` : null,
        situacao.limite ? `Retirar até: ${formatarData(new Date(situacao.limite).toISOString())}` : null,
        "",
        "Itens:",
        ...pedido.itens.map((item) => `  - ${item.nome}: ${formatarPreco(item.pago)}`),
        "",
        `Subtotal: ${formatarPreco(pedido.resumo.subtotal)}`,
        `Descontos: -${formatarPreco(pedido.resumo.descontos)}`,
        pedido.resumo.valorCupom ? `Cupom ${pedido.cupom}: -${formatarPreco(pedido.resumo.valorCupom)}` : null,
        pedido.resumo.valorPix ? `Desconto Pix: -${formatarPreco(pedido.resumo.valorPix)}` : null,
        `Total${pagaNaLoja(pedido) ? " a pagar na loja" : ""}: ${formatarPreco(pedido.resumo.total)}`,
    ];
    return linhas.filter((linha) => linha !== null).join("\n");
}

function Reserva({ pedido }) {
    const { cancelarReserva } = useLoja();
    const [confirmando, setConfirmando] = useState(false);
    const situacao = situacaoReserva(pedido);
    const codigo = pedido.retirada?.codigo;

    return (
        <article className={`pedido reserva-${situacao.id}`}>
            <header className="pedido-topo">
                <div>
                    <strong className="pedido-numero">{pedido.numero}</strong>
                    <span>
                        {formatarData(pedido.data, true)} · {METODOS[pedido.metodo]}
                    </span>
                </div>
                <span className={`status status-${situacao.id}`}>{situacao.rotulo}</span>
            </header>

            {situacao.id === "aguardando" && (
                <div className="reserva-etapa">
                    <IconeRelogio tamanho={18} />
                    <div>
                        <strong>Itens reservados</strong>
                        <span>
                            {pagaNaLoja(pedido) ? "A loja está separando seus itens." : "A loja está confirmando o pagamento."} Avisamos{" "}
                            {pedido.comprador.telefone ? `no ${pedido.comprador.telefone}` : "por aqui"} quando estiver pronto.
                        </span>
                    </div>
                </div>
            )}

            {situacao.id === "pronto" && (
                <div className="reserva-etapa pronta">
                    <IconeCheck tamanho={18} />
                    <div>
                        <strong>Pronto para retirada</strong>
                        <span>
                            Retire até {formatarData(new Date(situacao.limite).toISOString())} na loja
                            {codigo && (
                                <>
                                    {" "}
                                    com o código <strong className="mono reserva-codigo">{codigo}</strong>
                                </>
                            )}
                            {pagaNaLoja(pedido) ? ` e pague ${formatarPreco(pedido.resumo.total)} no balcão.` : "."}
                        </span>
                    </div>
                </div>
            )}

            {situacao.id === "retirado" && (
                <div className="reserva-etapa retirada">
                    <IconeCheck tamanho={18} />
                    <div>
                        <strong>Retirado na loja</strong>
                        <span>{situacao.retiradoEm ? `Retirado em ${formatarData(situacao.retiradoEm, true)}. ` : ""}Obrigado pela compra!</span>
                    </div>
                </div>
            )}

            {situacao.id === "vencido" && (
                <div className="reserva-etapa vencida">
                    <IconeRelogio tamanho={18} />
                    <div>
                        <strong>O prazo para retirar acabou</strong>
                        <span>Fale com a loja para combinar a retirada ou o reembolso.</span>
                    </div>
                </div>
            )}

            <ul className="pedido-itens">
                {pedido.itens.map((item) => (
                    <li key={item.id}>
                        <img src={imagensDoJogo(item).horizontal} alt="" loading="lazy" />
                        <span>
                            {item.nome}
                            <small className="pedido-item-tipo">{ehAcessorio(item) ? "Produto" : "Jogo"}</small>
                        </span>
                        <span className="mono">{formatarPreco(item.pago)}</span>
                    </li>
                ))}
            </ul>

            <footer className="pedido-rodape">
                <div className="pedido-total">
                    <span>{pagaNaLoja(pedido) && situacaoReserva(pedido).id !== "cancelado" ? "A pagar na loja" : "Total"}</span>
                    <strong className="mono">{formatarPreco(pedido.resumo.total)}</strong>
                </div>
                <div className="pedido-acoes">
                    <button type="button" className="botao botao-fantasma" onClick={() => baixarArquivo(`reserva-${pedido.numero}.txt`, comprovante(pedido))}>
                        <IconeDownload tamanho={15} /> Comprovante
                    </button>
                    {podeCancelar(pedido) &&
                        (confirmando ? (
                            <span className="confirmacao">
                                {pagaNaLoja(pedido) ? "Cancelar a reserva?" : "Cancelar a reserva e devolver o valor?"}
                                <button type="button" className="botao botao-secundario" onClick={() => setConfirmando(false)}>
                                    Voltar
                                </button>
                                <button type="button" className="botao botao-perigo" onClick={() => cancelarReserva(pedido.numero)}>
                                    Cancelar reserva
                                </button>
                            </span>
                        ) : (
                            <button type="button" className="botao botao-secundario" onClick={() => setConfirmando(true)}>
                                <IconeDesfazer tamanho={15} /> Cancelar reserva
                            </button>
                        ))}
                </div>
            </footer>
        </article>
    );
}

function Pedidos({ pedidos }) {
    const situacoes = pedidos.map((pedido) => situacaoReserva(pedido).id);
    const ativas = situacoes.filter((id) => id === "aguardando" || id === "pronto").length;
    const prontas = situacoes.filter((id) => id === "pronto").length;
    const totalReservado = pedidos.filter((_, i) => situacoes[i] !== "cancelado").reduce((soma, p) => soma + p.resumo.total, 0);

    return (
        <div className="pagina">
            <div className="pagina-cabecalho">
                <div>
                    <h1>Minhas reservas</h1>
                    <p>A loja separa seus itens e avisa quando o pedido estiver pronto para retirar. Pagou pelo site ou vai pagar no balcão? Está tudo aqui.</p>
                </div>
            </div>
            {pedidos.length === 0 ? (
                <div className="vazio">
                    <IconeRecibo tamanho={30} />
                    <h3>Nenhuma reserva ainda</h3>
                    <p>Quando você finalizar uma compra, a reserva aparece aqui com o código de retirada.</p>
                    <button type="button" className="botao botao-primario" onClick={() => navegar("/explorar")}>
                        Explorar jogos
                    </button>
                </div>
            ) : (
                <>
                    <div className="estatisticas">
                        <div>
                            <span>Reservas ativas</span>
                            <strong>{ativas}</strong>
                        </div>
                        <div>
                            <span>Prontas para retirar</span>
                            <strong>{prontas}</strong>
                        </div>
                        <div>
                            <span>Total reservado</span>
                            <strong>{formatarPreco(totalReservado)}</strong>
                        </div>
                    </div>
                    <InfoRetirada compacta />
                    <div className="lista-pedidos">
                        {pedidos.map((pedido) => (
                            <Reserva key={pedido.numero} pedido={pedido} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default Pedidos;
