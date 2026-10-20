import { useState } from "react";
import { navegar, usePresenca, useTeclaEsc } from "../hooks.js";
import { calcularParcelas, calcularPrecoFinal, DESCONTO_PIX, ehAcessorio, formatarPreco, gerarCodigo, imagensDoJogo, resumirCarrinho } from "../utils.js";
import { IconeBoleto, IconeCadeado, IconeCartao, IconeCheck, IconeFechar, IconeLoja, IconePix, IconeRecibo } from "./Icones.jsx";
import { InfoRetirada } from "./Retirada.jsx";
import { catalogoNoServidor } from "../catalogo.js";

const ETAPAS = ["Dados", "Pagamento", "Reservado"];

const METODOS = [
    { id: "pix", Icone: IconePix, nome: "Pix", detalhe: `${DESCONTO_PIX}% de desconto · a loja confirma rapidinho` },
    { id: "cartao", Icone: IconeCartao, nome: "Cartão de crédito", detalhe: "Até 10x sem juros" },
    { id: "boleto", Icone: IconeBoleto, nome: "Boleto", detalhe: "Confirmado após a compensação (até 2 dias úteis)" },
    { id: "loja", Icone: IconeLoja, nome: "Pagar na loja", detalhe: "Reserve agora e pague no balcão: dinheiro, Pix ou cartão" },
];

// (11) 98765-4321
function formatarTelefone(valor) {
    const d = valor.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function Checkout({ aberto, fechar, itens, cupom, perfil, logado, concluir }) {
    const { montado, saindo } = usePresenca(aberto);
    const [etapa, setEtapa] = useState(0);
    const [dados, setDados] = useState(perfil);
    const [metodo, setMetodo] = useState("pix");
    const [processando, setProcessando] = useState(false);
    const [erro, setErro] = useState("");
    const [pedido, setPedido] = useState(null);
    const [estavaAberto, setEstavaAberto] = useState(false);

    // Recomeça a cada abertura, já com os dados da última compra.
    if (aberto !== estavaAberto) {
        setEstavaAberto(aberto);
        if (aberto) {
            setEtapa(0);
            setPedido(null);
            setDados({ nome: "", email: "", ...perfil, telefone: perfil?.telefone ? formatarTelefone(perfil.telefone) : "" });
        }
    }

    useTeclaEsc(aberto && !processando, fechar);

    if (!montado) return null;

    const resumo = pedido ? pedido.resumo : resumirCarrinho(itens, cupom, etapa === 1 ? metodo : null);
    const parcelas = calcularParcelas(resumirCarrinho(itens, cupom).total);

    // o que fica guardado de cada item para mostrar a imagem em Minhas reservas
    const lembrete = (item) => (ehAcessorio(item) ? { tipo: "acessorio", ilustracao: item.ilustracao } : { appId: item.appId, imagens: item.imagens });

    async function pagar() {
        setProcessando(true);
        setErro("");
        try {
            const novo = catalogoNoServidor ? await reservarNoServidor() : await reservarDemonstracao();
            setPedido(novo);
            setEtapa(2);
            concluir(novo);
        } catch (e) {
            setErro(e.message);
        } finally {
            setProcessando(false);
        }
    }

    // Com o banco: a reserva é criada lá, com preço, cupom, desconto Pix e estoque validados no servidor.
    async function reservarNoServidor() {
        const { mensagemDeErro } = await import("../supabase.js");
        // cliente logado: a reserva fica ligada à conta (o banco usa o token, não um campo do formulário)
        const { clientes: supabase } = await import("../conta.js");
        const comprador = { nome: dados.nome.trim(), email: dados.email.trim(), telefone: dados.telefone.trim() };
        const { data, error } = await supabase.rpc("criar_reserva", { p_itens: itens.map((i) => i.id), p_metodo: metodo, p_cupom: cupom, p_cliente: comprador });
        if (error) throw new Error(mensagemDeErro(error));
        const r = data.resumo;
        return {
            numero: data.numero,
            data: data.data,
            status: "reservado",
            remoto: true,
            situacaoLoja: { status: data.status, pagamento: data.pagamento },
            metodo,
            cupom: data.cupom,
            comprador,
            retirada: { codigo: data.codigo },
            itens: data.itens.map((i) => ({ id: i.id, nome: i.nome, pago: Number(i.pago), ...lembrete(itens.find((x) => x.id === i.id) || {}) })),
            resumo: { subtotal: Number(r.subtotal), descontos: Number(r.descontos), valorCupom: Number(r.valorCupom), valorPix: Number(r.valorPix), total: Number(r.total) },
        };
    }

    // Sem servidor (demonstração): a reserva fica só neste navegador.
    async function reservarDemonstracao() {
        await new Promise((ok) => setTimeout(ok, 1600));
        return {
            numero: `UG-${gerarCodigo(8)}`,
            data: new Date().toISOString(),
            status: "reservado",
            metodo,
            cupom,
            comprador: { nome: dados.nome.trim(), email: dados.email.trim(), telefone: dados.telefone.trim() },
            // código que a pessoa mostra no balcão para retirar
            retirada: { codigo: gerarCodigo(6) },
            itens: itens.map((item) => ({ id: item.id, nome: item.nome, pago: calcularPrecoFinal(item), ...lembrete(item) })),
            resumo: resumirCarrinho(itens, cupom, metodo),
        };
    }

    return (
        <div className={saindo ? "modal-fundo saindo" : "modal-fundo"} onClick={processando ? undefined : fechar}>
            <div className="modal checkout" role="dialog" aria-modal="true" aria-labelledby="titulo-checkout" onClick={(e) => e.stopPropagation()}>
                <div className="modal-topo">
                    <h2 id="titulo-checkout">
                        <IconeCadeado tamanho={16} /> Finalizar reserva
                    </h2>
                    {!processando && (
                        <button type="button" className="icone-botao" onClick={fechar} aria-label="Fechar">
                            <IconeFechar tamanho={18} />
                        </button>
                    )}
                </div>

                <ol className="etapas">
                    {ETAPAS.map((nome, indice) => (
                        <li key={nome} className={indice < etapa ? "feita" : indice === etapa ? "atual" : ""}>
                            <span>{indice < etapa ? <IconeCheck tamanho={12} /> : indice + 1}</span>
                            {nome}
                        </li>
                    ))}
                </ol>

                <div className="checkout-corpo">
                    <div className="checkout-principal">
                        {etapa === 0 && (
                            <form
                                className="formulario"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    setEtapa(1);
                                }}
                            >
                                <fieldset>
                                    <legend>Seus dados</legend>
                                    {logado ? (
                                        <p className="checkout-conta">
                                            <IconeCadeado tamanho={14} /> Reserva ligada à sua conta: acompanhe em qualquer aparelho.
                                        </p>
                                    ) : (
                                        <p className="checkout-conta">
                                            Tem conta?{" "}
                                            <a href="#/conta" onClick={fechar}>
                                                Entre
                                            </a>{" "}
                                            para acompanhar a reserva em qualquer aparelho.
                                        </p>
                                    )}
                                    <label className="rotulo-campo">
                                        Nome completo
                                        <input className="campo" required minLength={3} value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} autoComplete="name" />
                                    </label>
                                    <label className="rotulo-campo">
                                        E-mail
                                        <input className="campo" required type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} autoComplete="email" readOnly={logado} />
                                    </label>
                                    <label className="rotulo-campo">
                                        Celular (WhatsApp)
                                        <input
                                            className="campo"
                                            required
                                            type="tel"
                                            inputMode="numeric"
                                            autoComplete="tel-national"
                                            placeholder="(00) 00000-0000"
                                            pattern="\(\d{2}\) \d{4,5}-\d{4}"
                                            title="DDD e número, ex.: (11) 98765-4321"
                                            value={dados.telefone}
                                            onChange={(e) => setDados({ ...dados, telefone: formatarTelefone(e.target.value) })}
                                        />
                                    </label>
                                    <p className="nota-rodape">A loja usa o celular para avisar quando seu pedido estiver pronto.</p>
                                </fieldset>

                                <InfoRetirada />

                                <button type="submit" className="botao botao-primario botao-grande botao-largo">
                                    Continuar para pagamento
                                </button>
                            </form>
                        )}

                        {etapa === 1 && (
                            <div className="formulario">
                                <fieldset>
                                    <legend>Forma de pagamento</legend>
                                    <div className="metodos" role="radiogroup" aria-label="Forma de pagamento">
                                        {METODOS.map(({ id, Icone, nome, detalhe }) => (
                                            <button type="button" key={id} role="radio" aria-checked={metodo === id} className={metodo === id ? "metodo ativo" : "metodo"} onClick={() => setMetodo(id)}>
                                                <Icone tamanho={20} />
                                                <span className="metodo-texto">
                                                    <strong>{nome}</strong>
                                                    <small>{id === "cartao" ? `Até ${parcelas.quantidade}x de ${formatarPreco(parcelas.valor)} sem juros` : detalhe}</small>
                                                </span>
                                                <span className="metodo-radio" aria-hidden="true" />
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                                <p className="nota-rodape">
                                    {metodo === "loja"
                                        ? "Os itens ficam reservados para você. A loja separa o pedido e avisa quando estiver pronto; você paga na hora de retirar."
                                        : "Os itens ficam reservados para você. Depois que a loja confirmar o pagamento, o pedido fica pronto para retirada."}
                                </p>
                                {erro && (
                                    <p className="erro-campo" role="alert">
                                        {erro}
                                    </p>
                                )}
                                <p className="aviso-demo">
                                    {catalogoNoServidor
                                        ? "Nenhum dado financeiro é pedido aqui: a loja confere o pagamento e confirma a sua reserva."
                                        : "Ambiente de demonstração: nenhum pagamento real é feito e nenhum dado financeiro é solicitado."}
                                </p>
                                <div className="formulario-acoes">
                                    <button type="button" className="botao botao-secundario" onClick={() => setEtapa(0)} disabled={processando}>
                                        Voltar
                                    </button>
                                    <button type="button" className="botao botao-primario botao-grande" onClick={pagar} disabled={processando}>
                                        {processando ? (
                                            <>
                                                <span className="girador" aria-hidden="true" /> Reservando…
                                            </>
                                        ) : (
                                            <>{metodo === "loja" ? `Reservar e pagar na loja · ${formatarPreco(resumo.total)}` : `Pagar e reservar ${formatarPreco(resumo.total)}`}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {etapa === 2 && pedido && (
                            <div className="sucesso">
                                <span className="sucesso-icone">
                                    <IconeCheck tamanho={28} />
                                </span>
                                <h3>Reserva {pedido.numero} feita</h3>
                                <p>
                                    {pedido.itens.length > 1 ? "Seus itens estão reservados" : "Seu item está reservado"}.{" "}
                                    {pedido.metodo === "loja" ? "Assim que a loja separar o pedido, ele fica " : "Assim que a loja confirmar o pagamento, o pedido fica "}
                                    <strong>pronto para retirada</strong>
                                    {pedido.comprador.telefone ? ` e avisamos no ${pedido.comprador.telefone}` : ""}.
                                    {pedido.metodo === "loja" && (
                                        <>
                                            {" "}
                                            Você paga <strong>{formatarPreco(pedido.resumo.total)}</strong> no balcão, em dinheiro, Pix ou cartão.
                                        </>
                                    )}
                                </p>
                                <div className="retirada-codigo">
                                    <span>Código de retirada</span>
                                    <strong className="mono">{pedido.retirada.codigo}</strong>
                                    <small>Mostre no balcão junto com um documento com foto.</small>
                                </div>
                                <InfoRetirada compacta />
                                <div className="formulario-acoes centralizado">
                                    <button
                                        type="button"
                                        className="botao botao-primario"
                                        onClick={() => {
                                            fechar();
                                            navegar("/reservas");
                                        }}
                                    >
                                        <IconeRecibo tamanho={15} /> Ver minhas reservas
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {etapa < 2 && (
                        <aside className="checkout-resumo">
                            <h3 className="titulo-secao">Resumo</h3>
                            <ul>
                                {itens.map((item) => (
                                    <li key={item.id}>
                                        <img src={imagensDoJogo(item).horizontal} alt="" />
                                        <span>{item.nome}</span>
                                        <span className="mono">{formatarPreco(calcularPrecoFinal(item))}</span>
                                    </li>
                                ))}
                            </ul>
                            <dl className="resumo">
                                <div>
                                    <dt>Subtotal</dt>
                                    <dd>{formatarPreco(resumo.subtotal)}</dd>
                                </div>
                                {resumo.descontos > 0 && (
                                    <div>
                                        <dt>Descontos</dt>
                                        <dd>-{formatarPreco(resumo.descontos)}</dd>
                                    </div>
                                )}
                                {resumo.valorCupom > 0 && (
                                    <div>
                                        <dt>Cupom {cupom}</dt>
                                        <dd>-{formatarPreco(resumo.valorCupom)}</dd>
                                    </div>
                                )}
                                {resumo.valorPix > 0 && (
                                    <div>
                                        <dt>Desconto Pix</dt>
                                        <dd>-{formatarPreco(resumo.valorPix)}</dd>
                                    </div>
                                )}
                                <div>
                                    <dt>Retirada na loja</dt>
                                    <dd>Grátis</dd>
                                </div>
                                <div className="resumo-total">
                                    <dt>Total</dt>
                                    <dd>{formatarPreco(resumo.total)}</dd>
                                </div>
                            </dl>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Checkout;
