import { useRef, useState } from "react";
import { navegar, usePresenca, useTeclaEsc } from "../hooks.js";
import { useLoja } from "../LojaContext.js";
import { calcularParcelas, calcularPrecoFinal, DESCONTO_PIX, DIAS_REEMBOLSO, ehAcessorio, FRETE, formatarData, formatarPreco, gerarChave, gerarCodigo, imagensDoJogo, PRAZO_ENTREGA, resumirCarrinho, somarDiasUteis } from "../utils.js";
import { IconeBiblioteca, IconeBoleto, IconeCadeado, IconeCaminhao, IconeCartao, IconeCheck, IconeFechar, IconePix, IconePresente, IconeRecibo } from "./Icones.jsx";

const ENDERECO_VAZIO = { cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" };
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const formatarCep = (digitos) => digitos.slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

const ETAPAS = ["Dados", "Pagamento", "Concluído"];

const METODOS = [
    { id: "pix", Icone: IconePix, nome: "Pix", detalhe: `${DESCONTO_PIX}% de desconto · aprovação imediata` },
    { id: "cartao", Icone: IconeCartao, nome: "Cartão de crédito", detalhe: "Até 10x sem juros" },
    { id: "boleto", Icone: IconeBoleto, nome: "Boleto", detalhe: "Aprovação em até 2 dias úteis" },
];

function Checkout({ aberto, fechar, itens, cupom, presenteInicial, perfil, concluir }) {
    const { possui } = useLoja();
    const { montado, saindo } = usePresenca(aberto);
    const [etapa, setEtapa] = useState(0);
    const [dados, setDados] = useState(perfil);
    const [presente, setPresente] = useState({ ativo: false, nome: "", email: "", mensagem: "" });
    const [metodo, setMetodo] = useState("pix");
    const [processando, setProcessando] = useState(false);
    const [pedido, setPedido] = useState(null);
    const [estavaAberto, setEstavaAberto] = useState(false);
    const [endereco, setEndereco] = useState(perfil.endereco || ENDERECO_VAZIO);
    const [cepStatus, setCepStatus] = useState({ buscando: false, erro: "" });
    const numeroRef = useRef(null);

    const possuidos = itens.filter((jogo) => possui(jogo.id));
    const presenteObrigatorio = possuidos.length > 0;
    // acessório é entregue em casa; jogo é digital (chave na biblioteca ou presente por e-mail)
    const temFisicos = itens.some(ehAcessorio);
    const temJogos = itens.some((item) => !ehAcessorio(item));

    // Recomeça a cada abertura, já com os dados da última compra.
    if (aberto !== estavaAberto) {
        setEstavaAberto(aberto);
        if (aberto) {
            setEtapa(0);
            setPedido(null);
            setDados(perfil);
            setEndereco(perfil.endereco || ENDERECO_VAZIO);
            setCepStatus({ buscando: false, erro: "" });
            setPresente({ ativo: presenteInicial || presenteObrigatorio, nome: "", email: "", mensagem: "" });
        }
    }

    useTeclaEsc(aberto && !processando, fechar);

    if (!montado) return null;

    const ehPresente = presente.ativo || presenteObrigatorio;
    const itensExibidos = pedido ? pedido.itensJogos : itens;
    const resumo = pedido ? pedido.resumo : resumirCarrinho(itens, cupom, etapa === 1 ? metodo : null);
    const parcelas = calcularParcelas(resumirCarrinho(itens, cupom).total);

    // CEP completo: busca rua, bairro, cidade e UF na ViaCEP (se falhar, a pessoa preenche à mão)
    async function mudarCep(valor) {
        const digitos = valor.replace(/\D/g, "");
        setEndereco((e) => ({ ...e, cep: formatarCep(digitos) }));
        setCepStatus({ buscando: false, erro: "" });
        if (digitos.length !== 8) return;
        setCepStatus({ buscando: true, erro: "" });
        try {
            const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
            const dadosCep = await resposta.json();
            if (dadosCep.erro) {
                setCepStatus({ buscando: false, erro: "CEP não encontrado. Confira o número ou preencha o endereço à mão." });
                return;
            }
            setEndereco((e) => ({ ...e, rua: dadosCep.logradouro || e.rua, bairro: dadosCep.bairro || e.bairro, cidade: dadosCep.localidade || e.cidade, uf: dadosCep.uf || e.uf }));
            setCepStatus({ buscando: false, erro: "" });
            numeroRef.current?.focus();
        } catch {
            setCepStatus({ buscando: false, erro: "Não foi possível consultar o CEP agora. Preencha o endereço à mão." });
        }
    }

    const campoEndereco = (chave) => ({ value: endereco[chave], onChange: (e) => setEndereco({ ...endereco, [chave]: e.target.value }) });

    function pagar() {
        setProcessando(true);
        setTimeout(() => {
            const final = resumirCarrinho(itens, cupom, metodo);
            const novo = {
                numero: `UG-${gerarCodigo(8)}`,
                data: new Date().toISOString(),
                status: "pago",
                metodo,
                cupom,
                comprador: { nome: dados.nome.trim(), email: dados.email.trim() },
                presente: ehPresente ? { nome: presente.nome.trim(), email: presente.email.trim(), mensagem: presente.mensagem.trim() } : null,
                itens: itens.map((item) =>
                    ehAcessorio(item)
                        ? { id: item.id, tipo: "acessorio", ilustracao: item.ilustracao, nome: item.nome, pago: calcularPrecoFinal(item) }
                        : { id: item.id, appId: item.appId, nome: item.nome, pago: calcularPrecoFinal(item), chave: gerarChave() },
                ),
                entrega: temFisicos
                    ? {
                          endereco: { ...endereco, rua: endereco.rua.trim(), numero: endereco.numero.trim(), complemento: endereco.complemento.trim(), bairro: endereco.bairro.trim(), cidade: endereco.cidade.trim() },
                          frete: final.frete,
                          previsao: [somarDiasUteis(new Date(), FRETE.prazoMin).toISOString(), somarDiasUteis(new Date(), FRETE.prazoMax).toISOString()],
                      }
                    : null,
                resumo: final,
            };
            setPedido({ ...novo, itensJogos: itens });
            setProcessando(false);
            setEtapa(2);
            concluir(novo);
        }, 1600);
    }

    return (
        <div className={saindo ? "modal-fundo saindo" : "modal-fundo"} onClick={processando ? undefined : fechar}>
            <div className="modal checkout" role="dialog" aria-modal="true" aria-labelledby="titulo-checkout" onClick={(e) => e.stopPropagation()}>
                <div className="modal-topo">
                    <h2 id="titulo-checkout">
                        <IconeCadeado tamanho={16} /> Finalizar compra
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
                                    <label className="rotulo-campo">
                                        Nome completo
                                        <input className="campo" required minLength={3} value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} autoComplete="name" />
                                    </label>
                                    <label className="rotulo-campo">
                                        E-mail
                                        <input className="campo" required type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} autoComplete="email" />
                                    </label>
                                </fieldset>

                                {temFisicos && (
                                    <fieldset className="entrega-campos">
                                        <legend>
                                            <IconeCaminhao tamanho={16} /> Endereço de entrega
                                        </legend>
                                        <label className="rotulo-campo campo-cep">
                                            CEP
                                            <input
                                                className="campo mono"
                                                required
                                                inputMode="numeric"
                                                autoComplete="postal-code"
                                                pattern="\d{5}-?\d{3}"
                                                placeholder="00000-000"
                                                value={endereco.cep}
                                                onChange={(e) => mudarCep(e.target.value)}
                                                aria-invalid={Boolean(cepStatus.erro)}
                                                aria-describedby="cep-ajuda"
                                            />
                                        </label>
                                        <p id="cep-ajuda" className={cepStatus.erro ? "erro-campo" : "nota-rodape"} aria-live="polite">
                                            {cepStatus.buscando ? "Buscando endereço…" : cepStatus.erro || "Digite o CEP e o endereço aparece sozinho."}
                                        </p>
                                        <label className="rotulo-campo campo-rua">
                                            Rua
                                            <input className="campo" required autoComplete="address-line1" {...campoEndereco("rua")} />
                                        </label>
                                        <label className="rotulo-campo campo-numero">
                                            Número
                                            <input className="campo" required ref={numeroRef} inputMode="numeric" {...campoEndereco("numero")} />
                                        </label>
                                        <label className="rotulo-campo campo-complemento">
                                            Complemento (opcional)
                                            <input className="campo" autoComplete="address-line2" {...campoEndereco("complemento")} />
                                        </label>
                                        <label className="rotulo-campo campo-bairro">
                                            Bairro
                                            <input className="campo" required {...campoEndereco("bairro")} />
                                        </label>
                                        <label className="rotulo-campo campo-cidade">
                                            Cidade
                                            <input className="campo" required autoComplete="address-level2" {...campoEndereco("cidade")} />
                                        </label>
                                        <label className="rotulo-campo campo-uf">
                                            UF
                                            <select className="campo seletor" required autoComplete="address-level1" {...campoEndereco("uf")}>
                                                <option value="">--</option>
                                                {UFS.map((uf) => (
                                                    <option key={uf} value={uf}>
                                                        {uf}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <p className="nota-rodape entrega-prazo">
                                            Chega em {PRAZO_ENTREGA} · {resumo.frete ? `frete de ${formatarPreco(resumo.frete)}` : "frete grátis"}
                                        </p>
                                    </fieldset>
                                )}

                                {temJogos && (
                                <fieldset>
                                    <label className="interruptor">
                                        <input type="checkbox" checked={ehPresente} disabled={presenteObrigatorio} onChange={(e) => setPresente({ ...presente, ativo: e.target.checked })} />
                                        <span className="interruptor-trilho" aria-hidden="true" />
                                        <span>
                                            <IconePresente tamanho={15} /> É um presente
                                        </span>
                                    </label>
                                    {presenteObrigatorio && (
                                        <p className="nota-rodape">
                                            Você já possui {possuidos.map((j) => j.nome).join(", ")}: {possuidos.length > 1 ? "esses itens só podem" : "esse item só pode"} ser comprado{possuidos.length > 1 ? "s" : ""} como presente.
                                        </p>
                                    )}
                                    {ehPresente && (
                                        <div className="presente-campos">
                                            <label className="rotulo-campo">
                                                Nome de quem vai receber
                                                <input className="campo" required value={presente.nome} onChange={(e) => setPresente({ ...presente, nome: e.target.value })} />
                                            </label>
                                            <label className="rotulo-campo">
                                                E-mail de quem vai receber
                                                <input className="campo" required type="email" value={presente.email} onChange={(e) => setPresente({ ...presente, email: e.target.value })} />
                                            </label>
                                            <label className="rotulo-campo">
                                                Mensagem (opcional)
                                                <textarea className="campo" rows={2} maxLength={160} value={presente.mensagem} onChange={(e) => setPresente({ ...presente, mensagem: e.target.value })} />
                                            </label>
                                        </div>
                                    )}
                                    {ehPresente && temFisicos && <p className="nota-rodape">O presente vale para os jogos; os acessórios são entregues no endereço acima.</p>}
                                </fieldset>
                                )}

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
                                <p className="aviso-demo">Ambiente de demonstração: nenhum pagamento real é feito e nenhum dado financeiro é solicitado.</p>
                                <div className="formulario-acoes">
                                    <button type="button" className="botao botao-secundario" onClick={() => setEtapa(0)} disabled={processando}>
                                        Voltar
                                    </button>
                                    <button type="button" className="botao botao-primario botao-grande" onClick={pagar} disabled={processando}>
                                        {processando ? (
                                            <>
                                                <span className="girador" aria-hidden="true" /> Processando…
                                            </>
                                        ) : (
                                            <>Pagar {formatarPreco(resumo.total)}</>
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
                                <h3>Pedido {pedido.numero} confirmado</h3>
                                {pedido.itens.some((i) => !ehAcessorio(i)) &&
                                    (pedido.presente ? (
                                        <p>
                                            O presente foi enviado para <strong>{pedido.presente.email}</strong>. Você recebe a confirmação em {pedido.comprador.email}.
                                        </p>
                                    ) : (
                                        <p>
                                            {pedido.itens.filter((i) => !ehAcessorio(i)).length > 1 ? "Os jogos já estão" : "O jogo já está"} na sua biblioteca, com a chave de ativação. Uma cópia foi enviada para{" "}
                                            <strong>{pedido.comprador.email}</strong>.
                                        </p>
                                    ))}
                                {pedido.entrega && (
                                    <p>
                                        <IconeCaminhao tamanho={15} /> {pedido.itens.filter(ehAcessorio).length > 1 ? "Os acessórios chegam" : "O acessório chega"} entre{" "}
                                        <strong>
                                            {formatarData(pedido.entrega.previsao[0])} e {formatarData(pedido.entrega.previsao[1])}
                                        </strong>{" "}
                                        em {pedido.entrega.endereco.rua}, {pedido.entrega.endereco.numero}, {pedido.entrega.endereco.cidade}/{pedido.entrega.endereco.uf}.
                                    </p>
                                )}
                                <p className="nota-rodape">Você pode solicitar reembolso em até {DIAS_REEMBOLSO} dias em Meus pedidos.</p>
                                <div className="formulario-acoes centralizado">
                                    <button
                                        type="button"
                                        className="botao botao-secundario"
                                        onClick={() => {
                                            fechar();
                                            navegar("/pedidos");
                                        }}
                                    >
                                        <IconeRecibo tamanho={15} /> Ver pedido
                                    </button>
                                    {!pedido.presente && pedido.itens.some((i) => !ehAcessorio(i)) && (
                                        <button
                                            type="button"
                                            className="botao botao-primario"
                                            onClick={() => {
                                                fechar();
                                                navegar("/biblioteca");
                                            }}
                                        >
                                            <IconeBiblioteca tamanho={15} /> Ir para a biblioteca
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {etapa < 2 && (
                        <aside className="checkout-resumo">
                            <h3 className="titulo-secao">Resumo</h3>
                            <ul>
                                {itensExibidos.map((jogo) => (
                                    <li key={jogo.id}>
                                        <img src={imagensDoJogo(jogo).horizontal} alt="" />
                                        <span>{jogo.nome}</span>
                                        <span className="mono">{formatarPreco(calcularPrecoFinal(jogo))}</span>
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
                                {resumo.temFisicos && (
                                    <div>
                                        <dt>Frete</dt>
                                        <dd>{resumo.frete ? formatarPreco(resumo.frete) : "Grátis"}</dd>
                                    </div>
                                )}
                                <div className="resumo-total">
                                    <dt>Total</dt>
                                    <dd>{formatarPreco(resumo.total)}</dd>
                                </div>
                            </dl>
                            {ehPresente && (
                                <p className="nota-rodape">
                                    <IconePresente tamanho={13} /> Compra para presente
                                </p>
                            )}
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Checkout;
