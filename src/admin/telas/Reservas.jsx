// Reservas da loja: a equipe confere o pagamento (ou separa, quando o cliente paga no balcão),
// entrega com o código de retirada e cancela quando preciso. O banco valida cada passo e devolve o estoque.
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconeRecibo } from "../../componentes/comum/Icones.jsx";
import { formatarPreco, normalizar } from "../../utilidades/funcoes.js";
import * as api from "../servicos/api.js";
import { Cabecalho, Campo, Carregando, Confirmacao, ErroCarregar, Selo, Vazio } from "../componentes/ui.jsx";
import { dataHora, useAdmin } from "../servicos/util.js";

const ABAS = [
    ["aguardando", "Aguardando a loja"],
    ["confirmado", "Prontas para retirar"],
    ["retirado", "Retiradas"],
    ["cancelado", "Canceladas"],
    ["", "Todas"],
];
const METODO = { pix: "Pix", cartao: "Cartão de crédito", boleto: "Boleto", loja: "Paga no balcão" };
const PAGAMENTO = {
    pendente: ["Aguardando pagamento", "aviso"],
    confirmado: ["Pagamento conferido", "ok"],
    no_balcao: ["Paga na retirada", "neutro"],
    devolvido: ["Valor a devolver", "perigo"],
};
const STATUS = { aguardando: ["Aguardando a loja", "aviso"], confirmado: ["Pronta para retirar", "ok"], retirado: ["Retirada", "neutro"], cancelado: ["Cancelada", "apagado"] };

export default function Reservas() {
    const { avisar } = useAdmin();
    const [reservas, setReservas] = useState(null);
    const [erro, setErro] = useState("");
    const [aba, setAba] = useState("aguardando");
    const [busca, setBusca] = useState("");
    const [acao, setAcao] = useState(null); // { reserva, tipo }
    const [codigo, setCodigo] = useState("");
    const [ocupado, setOcupado] = useState(false);

    const carregar = useCallback(async () => {
        try {
            setReservas(await api.listarReservas());
            setErro("");
        } catch (e) {
            setErro(e.message);
        }
    }, []);

    // carrega e confere novas reservas a cada 30 s enquanto a tela está aberta
    useEffect(() => {
        carregar();
        const intervalo = setInterval(carregar, 30000);
        return () => clearInterval(intervalo);
    }, [carregar]);

    const lista = useMemo(() => {
        const termo = normalizar(busca);
        return (reservas || []).filter((r) => (!aba || r.status === aba) && (!termo || normalizar(`${r.numero} ${r.cliente_nome} ${r.cliente_email} ${r.cliente_telefone || ""}`).includes(termo)));
    }, [reservas, aba, busca]);

    async function executar() {
        const { reserva, tipo } = acao;
        if (tipo === "retirar" && codigo.trim().toUpperCase() !== reserva.codigo_retirada) {
            avisar("O código não confere com o da reserva. Peça para o cliente mostrar de novo.", "erro");
            return;
        }
        setOcupado(true);
        try {
            await api.atualizarReserva(reserva.numero, tipo);
            const mensagens = {
                confirmar: reserva.metodo === "loja" ? `Reserva ${reserva.numero} separada: o cliente já pode retirar.` : `Pagamento da reserva ${reserva.numero} conferido: pronta para retirar.`,
                retirar: `Reserva ${reserva.numero} entregue.`,
                cancelar: `Reserva ${reserva.numero} cancelada e estoque devolvido.`,
            };
            avisar(mensagens[tipo]);
            setAcao(null);
            setCodigo("");
            await carregar();
        } catch (e) {
            avisar(e.message, "erro");
        } finally {
            setOcupado(false);
        }
    }

    const contar = (s) => (reservas || []).filter((r) => !s || r.status === s).length;

    return (
        <>
            <Cabecalho titulo="Reservas" descricao="Confira o pagamento no seu banco ou maquininha antes de confirmar. O cliente acompanha tudo em Minhas reservas." />
            <div className="a-barra">
                <div className="a-segmentos" role="tablist" aria-label="Situação">
                    {ABAS.map(([id, rotulo]) => (
                        <button type="button" key={id || "todas"} role="tab" aria-selected={aba === id} className={aba === id ? "ativo" : ""} onClick={() => setAba(id)}>
                            {rotulo} <span className="a-contagem-aba">{reservas ? contar(id) : "…"}</span>
                        </button>
                    ))}
                </div>
                <input className="a-busca" type="search" placeholder="Número, nome, e-mail ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar reserva" />
            </div>

            {erro ? (
                <ErroCarregar mensagem={erro} tentarDeNovo={carregar} />
            ) : !reservas ? (
                <Carregando linhas={6} />
            ) : lista.length === 0 ? (
                <Vazio icone={IconeRecibo} titulo={busca ? "Nenhuma reserva encontrada" : "Nenhuma reserva aqui"} texto={busca ? "Confira o número ou o nome digitado." : "As reservas feitas na loja aparecem aqui na hora."} />
            ) : (
                <div className="a-reservas">
                    {lista.map((r) => {
                        const [rotuloStatus, tomStatus] = STATUS[r.status];
                        const [rotuloPagamento, tomPagamento] = PAGAMENTO[r.pagamento] || [r.pagamento, "neutro"];
                        return (
                            <article key={r.numero} className="a-cartao a-reserva">
                                <header>
                                    <div>
                                        <strong className="a-mono">{r.numero}</strong>
                                        <small>{dataHora(r.criado_em)}</small>
                                    </div>
                                    <div className="a-selos">
                                        <Selo tom={tomStatus}>{rotuloStatus}</Selo>
                                        <Selo tom={tomPagamento}>{rotuloPagamento}</Selo>
                                    </div>
                                </header>
                                <dl className="a-reserva-dados">
                                    <div>
                                        <dt>Cliente</dt>
                                        <dd>{r.cliente_nome}</dd>
                                    </div>
                                    <div>
                                        <dt>Contato</dt>
                                        <dd>
                                            <a href={`mailto:${r.cliente_email}`}>{r.cliente_email}</a>
                                            {r.cliente_telefone && (
                                                <>
                                                    {" · "}
                                                    <a href={`https://wa.me/55${r.cliente_telefone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                                                        {r.cliente_telefone}
                                                    </a>
                                                </>
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Pagamento</dt>
                                        <dd>
                                            {METODO[r.metodo]}
                                            {r.cupom && ` · cupom ${r.cupom}`}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Total</dt>
                                        <dd>
                                            <strong>{formatarPreco(Number(r.total))}</strong>
                                        </dd>
                                    </div>
                                </dl>
                                <ul className="a-reserva-itens">
                                    {r.reserva_itens.map((i) => (
                                        <li key={i.id}>
                                            <span>
                                                {i.quantidade > 1 && `${i.quantidade}× `}
                                                {i.nome}
                                            </span>
                                            <span className="a-texto-apagado">{formatarPreco(Number(i.preco_unitario))}</span>
                                        </li>
                                    ))}
                                </ul>
                                {(r.status === "aguardando" || r.status === "confirmado") && (
                                    <footer className="a-acoes">
                                        {r.status === "aguardando" && (
                                            <button type="button" className="a-botao primario" onClick={() => setAcao({ reserva: r, tipo: "confirmar" })}>
                                                {r.metodo === "loja" ? "Itens separados" : "Confirmar pagamento"}
                                            </button>
                                        )}
                                        {r.status === "confirmado" && (
                                            <button type="button" className="a-botao primario" onClick={() => setAcao({ reserva: r, tipo: "retirar" })}>
                                                Entregar ao cliente
                                            </button>
                                        )}
                                        <button type="button" className="a-botao" onClick={() => setAcao({ reserva: r, tipo: "cancelar" })}>
                                            Cancelar reserva
                                        </button>
                                    </footer>
                                )}
                                {r.status === "retirado" && <p className="a-texto-apagado">Retirada em {dataHora(r.retirado_em)}.</p>}
                                {r.status === "cancelado" && <p className="a-texto-apagado">Cancelada em {dataHora(r.cancelado_em)}.</p>}
                            </article>
                        );
                    })}
                </div>
            )}

            {acao && (
                <Confirmacao
                    titulo={acao.tipo === "confirmar" ? (acao.reserva.metodo === "loja" ? "Itens separados?" : "Confirmar pagamento?") : acao.tipo === "retirar" ? "Entregar ao cliente" : "Cancelar reserva?"}
                    texto={
                        acao.tipo === "confirmar"
                            ? acao.reserva.metodo === "loja"
                                ? `A reserva ${acao.reserva.numero} fica pronta para retirar; o cliente paga ${formatarPreco(Number(acao.reserva.total))} no balcão.`
                                : `Confirme só depois de ver ${formatarPreco(Number(acao.reserva.total))} (${METODO[acao.reserva.metodo]}) no seu extrato. O cliente passa a ver "Pronto para retirada".`
                            : acao.tipo === "retirar"
                              ? `Peça o código de retirada e um documento com foto de ${acao.reserva.cliente_nome}.${acao.reserva.metodo === "loja" ? ` Receba ${formatarPreco(Number(acao.reserva.total))} antes de entregar.` : ""}`
                              : `Os itens voltam para o estoque.${acao.reserva.pagamento === "confirmado" ? " Lembre de devolver o valor ao cliente." : ""}`
                    }
                    rotulo={acao.tipo === "confirmar" ? "Confirmar" : acao.tipo === "retirar" ? "Entregar" : "Cancelar reserva"}
                    perigo={acao.tipo === "cancelar"}
                    ocupado={ocupado}
                    aoConfirmar={executar}
                    aoCancelar={() => {
                        setAcao(null);
                        setCodigo("");
                    }}
                >
                    {acao.tipo === "retirar" && (
                        <Campo rotulo="Código de retirada apresentado">
                            {(id) => <input id={id} className="a-mono" autoComplete="off" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} />}
                        </Campo>
                    )}
                </Confirmacao>
            )}
        </>
    );
}
