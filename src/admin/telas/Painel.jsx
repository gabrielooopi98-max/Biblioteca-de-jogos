// Visão geral: vendas, reservas e catálogo com gráficos. Tudo calculado na hora a partir do banco (nada inventado).
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconeAlerta, IconeCaixa, IconeCarrinho, IconeEtiqueta, IconeImagem, IconeRecibo, IconeRelogio, IconeSetaDireita } from "../../componentes/comum/Icones.jsx";
import { formatarPreco } from "../../utilidades/funcoes.js";
import * as api from "../servicos/api.js";
import { Barras, GraficoArea, GraficoRosca } from "../componentes/graficos.jsx";
import { Cabecalho, Carregando, ErroCarregar, Selo, Vazio } from "../componentes/ui.jsx";
import { dataHora, resumoDetalhes, ROTULOS_ACAO, useAdmin } from "../servicos/util.js";
import { CORES, intervalo, moedaCurta, PERIODOS, resumo, ROTULO_METODO, serieDeReceita, somarPor, variacao, vendasPorProduto } from "../servicos/vendas.js";

const TOM_STATUS = { aguardando: ["Aguardando", "aviso"], confirmado: ["Pronta", "ok"], retirado: ["Retirada", "neutro"], cancelado: ["Cancelada", "apagado"] };
const COR_STATUS = { aguardando: "#fbbf24", confirmado: "#4ade80", retirado: "#60a5fa", cancelado: "#737b87" };

function Variacao({ v, inverter = false }) {
    if (!v) return <span className="a-variacao neutra">sem dados anteriores</span>;
    if (v.novo) return <span className="a-variacao sobe">novo no período</span>;
    const sobe = v.pct >= 0;
    const bom = inverter ? !sobe : sobe;
    return (
        <span className={`a-variacao ${Math.abs(v.pct) < 0.005 ? "neutra" : bom ? "sobe" : "desce"}`}>
            {sobe ? "▲" : "▼"} {Math.abs(v.pct * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%<small> vs. período anterior</small>
        </span>
    );
}

function Kpi({ rotulo, valor, v, icone: Icone, destaque }) {
    return (
        <div className={destaque ? "a-kpi destaque" : "a-kpi"}>
            <div className="a-kpi-topo">
                <span>{rotulo}</span>
                <span className="a-kpi-icone">
                    <Icone tamanho={17} />
                </span>
            </div>
            <strong className="a-kpi-valor">{valor}</strong>
            <Variacao v={v} />
        </div>
    );
}

function Atencao({ href, icone: Icone, texto, valor, tom }) {
    return (
        <li>
            <a href={href} className={`a-atencao ${tom}`}>
                <span className="a-atencao-icone">
                    <Icone tamanho={16} />
                </span>
                <span className="a-atencao-texto">{texto}</span>
                <strong>{valor}</strong>
                <IconeSetaDireita tamanho={14} />
            </a>
        </li>
    );
}

export default function Painel() {
    const { produtos, categorias, erroDados, recarregar } = useAdmin();
    const [periodo, setPeriodo] = useState("30d");
    const [reservas, setReservas] = useState(null);
    const [recentes, setRecentes] = useState(null);
    const [erro, setErro] = useState("");

    // busca o dobro do período (o atual e o anterior, para comparar); 12 meses busca 2 anos
    const carregar = useCallback(async () => {
        try {
            const { inicioAnterior } = intervalo("12m");
            const [r, h] = await Promise.all([api.reservasParaRelatorio(inicioAnterior), api.listarHistorico({ pagina: 0 })]);
            setReservas(r);
            setRecentes(h.linhas.slice(0, 6));
            setErro("");
        } catch (e) {
            setErro(e.message);
        }
    }, []);

    useEffect(() => {
        carregar();
    }, [carregar]);

    const dados = useMemo(() => {
        if (!reservas) return null;
        const { inicio, fim, inicioAnterior } = intervalo(periodo);
        const fimAnterior = new Date(inicio.getTime() - 1);
        const atual = resumo(reservas, inicio, fim);
        const anterior = resumo(reservas, inicioAnterior, fimAnterior);
        const serie = serieDeReceita(reservas, periodo);
        const doPeriodo = reservas.filter((r) => new Date(r.criado_em) >= inicio);
        const porStatus = ["aguardando", "confirmado", "retirado", "cancelado"].map((s) => ({ rotulo: TOM_STATUS[s][0], valor: doPeriodo.filter((r) => r.status === s).length, cor: COR_STATUS[s] }));
        const vendidas = doPeriodo.filter((r) => r.status === "confirmado" || r.status === "retirado");
        const porMetodo = somarPor(vendidas, (r) => r.metodo, (r) => Number(r.total))
            .sort((a, b) => b.valor - a.valor)
            .map((m, i) => ({ rotulo: ROTULO_METODO[m.chave] || m.chave, valor: m.valor, cor: CORES[i % CORES.length] }));
        const porProduto = vendasPorProduto(reservas, inicio, fim).filter((p) => p.receita > 0);
        return { atual, anterior, serie, porStatus, porMetodo, porProduto };
    }, [reservas, periodo]);

    // receita por departamento (categoria atual de cada produto vendido)
    const porDepartamento = useMemo(() => {
        if (!dados || !produtos) return [];
        const categoriaDe = new Map(produtos.map((p) => [p.id, p.categoria_id]));
        const nomeDe = new Map((categorias || []).map((c) => [c.id, c.nome]));
        return somarPor(dados.porProduto, (p) => categoriaDe.get(p.produtoId) || "sem", (p) => p.receita)
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 6)
            .map((d, i) => ({ chave: d.chave, rotulo: nomeDe.get(d.chave) || "Sem departamento", valor: d.valor, cor: CORES[i % CORES.length] }));
    }, [dados, produtos, categorias]);

    if (erroDados) return <ErroCarregar mensagem={erroDados} tentarDeNovo={recarregar} />;
    if (!produtos) return <Carregando linhas={6} />;

    const visiveis = produtos.filter((p) => p.status !== "arquivado");
    const publicados = visiveis.filter((p) => p.status === "ativo").length;
    const emPromocao = visiveis.filter((p) => api.situacaoPromocao(p) === "vigente").length;
    const semImagem = visiveis.filter(api.semImagem).length;
    const baixo = visiveis.filter(api.estoqueBaixo).length;
    const esgotados = visiveis.filter(api.esgotado).length;
    const rascunhos = visiveis.filter((p) => p.status === "rascunho" || p.status === "inativo").length;
    const em3dias = Date.now() + 3 * 864e5;
    const terminando = visiveis.filter((p) => api.situacaoPromocao(p) === "vigente" && p.promocao_fim && new Date(p.promocao_fim).getTime() < em3dias).length;
    const aguardando = reservas?.filter((r) => r.status === "aguardando") ?? [];
    const prontas = reservas?.filter((r) => r.status === "confirmado").length ?? 0;
    const porMes = dados?.serie.porMes;
    const nomePeriodo = PERIODOS.find((p) => p.id === periodo).rotulo;

    const pendencias = [
        aguardando.length && { href: "#/admin/reservas", icone: IconeRecibo, texto: "Reservas aguardando a loja", valor: aguardando.length, tom: "aviso" },
        prontas && { href: "#/admin/reservas", icone: IconeCarrinho, texto: "Prontas esperando o cliente", valor: prontas, tom: "neutro" },
        esgotados && { href: "#/admin/estoque", icone: IconeCaixa, texto: "Produtos esgotados", valor: esgotados, tom: "perigo" },
        baixo && { href: "#/admin/estoque", icone: IconeCaixa, texto: "Com estoque baixo", valor: baixo, tom: "aviso" },
        terminando && { href: "#/admin/promocoes", icone: IconeEtiqueta, texto: "Promoções acabando em 3 dias", valor: terminando, tom: "aviso" },
        semImagem && { href: "#/admin/produtos/sem-imagem", icone: IconeImagem, texto: "Produtos sem imagem", valor: semImagem, tom: "neutro" },
        rascunhos && { href: "#/admin/produtos/nao-publicados", icone: IconeAlerta, texto: "Rascunhos e inativos", valor: rascunhos, tom: "neutro" },
    ].filter(Boolean);

    return (
        <>
            <Cabecalho titulo="Visão geral" descricao="Vendas, reservas e catálogo da loja, calculados na hora com os dados do banco.">
                <div className="a-segmentos" role="tablist" aria-label="Período">
                    {PERIODOS.map((p) => (
                        <button key={p.id} type="button" role="tab" aria-selected={periodo === p.id} className={periodo === p.id ? "ativo" : ""} onClick={() => setPeriodo(p.id)}>
                            {p.rotulo}
                        </button>
                    ))}
                </div>
            </Cabecalho>

            {erro && (
                <p className="a-alerta">
                    {erro}{" "}
                    <button type="button" className="a-link" onClick={carregar}>
                        Tentar de novo
                    </button>
                </p>
            )}

            {!dados && !erro ? (
                <Carregando linhas={6} texto="Calculando vendas" />
            ) : dados ? (
                <>
                    <section className="a-kpis" aria-label={`Vendas nos últimos ${nomePeriodo}`}>
                        <Kpi destaque rotulo="Receita confirmada" valor={formatarPreco(dados.atual.receita)} v={variacao(dados.atual.receita, dados.anterior.receita)} icone={IconeEtiqueta} />
                        <Kpi rotulo="Vendas" valor={dados.atual.vendas.toLocaleString("pt-BR")} v={variacao(dados.atual.vendas, dados.anterior.vendas)} icone={IconeRecibo} />
                        <Kpi rotulo="Ticket médio" valor={formatarPreco(dados.atual.ticket)} v={variacao(dados.atual.ticket, dados.anterior.ticket)} icone={IconeCarrinho} />
                        <Kpi rotulo="Itens vendidos" valor={dados.atual.itens.toLocaleString("pt-BR")} v={variacao(dados.atual.itens, dados.anterior.itens)} icone={IconeCaixa} />
                    </section>

                    <div className="a-painel-grade">
                        <section className="a-cartao a-span-8">
                            <div className="a-cartao-topo">
                                <div>
                                    <h2>Receita {porMes ? "por mês" : "por dia"}</h2>
                                    <p>Reservas confirmadas ou retiradas, pela data da confirmação.</p>
                                </div>
                                <div className="a-cartao-numero">
                                    <strong>{formatarPreco(dados.atual.receita)}</strong>
                                    <small>últimos {nomePeriodo}</small>
                                </div>
                            </div>
                            <GraficoArea
                                pontos={dados.serie.pontos}
                                rotuloX={(p) => (porMes ? p.data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") : p.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }))}
                                rotuloDica={(p) => (
                                    <>
                                        <small>{porMes ? p.data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : p.data.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</small>
                                        <strong>{formatarPreco(p.valor)}</strong>
                                        <small>
                                            {p.vendas} {p.vendas === 1 ? "venda" : "vendas"}
                                        </small>
                                    </>
                                )}
                                vazio={dados.atual.vendas ? "" : "Nenhuma venda confirmada neste período ainda."}
                            />
                        </section>

                        <section className="a-cartao a-span-4">
                            <div className="a-cartao-topo">
                                <div>
                                    <h2>Reservas por situação</h2>
                                    <p>Feitas nos últimos {nomePeriodo}.</p>
                                </div>
                            </div>
                            <GraficoRosca partes={dados.porStatus} rotuloCentro="reservas" />
                            <p className="a-cartao-rodape">
                                Cancelamento: <strong>{Math.round(dados.atual.taxaCancelamento * 100)}%</strong>
                                <Variacao v={variacao(dados.atual.taxaCancelamento, dados.anterior.taxaCancelamento)} inverter />
                            </p>
                        </section>

                        <section className="a-cartao a-span-5">
                            <div className="a-cartao-topo">
                                <div>
                                    <h2>Mais vendidos</h2>
                                    <p>Por receita no período.</p>
                                </div>
                                <a className="a-link" href="#/admin/vendas">
                                    Ver todos
                                </a>
                            </div>
                            {dados.porProduto.length ? (
                                <Barras
                                    itens={[...dados.porProduto]
                                        .sort((a, b) => b.receita - a.receita)
                                        .slice(0, 6)
                                        .map((p) => ({ chave: p.id, posicao: true, rotulo: p.nome, href: p.produtoId ? `#/admin/produtos/${p.produtoId}` : null, valor: p.receita, detalhe: `${p.unidades} ${p.unidades === 1 ? "unidade" : "unidades"}` }))}
                                />
                            ) : (
                                <p className="a-sem-dados">Os produtos vendidos aparecem aqui assim que a loja confirmar a primeira reserva.</p>
                            )}
                        </section>

                        <section className="a-cartao a-span-4">
                            <div className="a-cartao-topo">
                                <div>
                                    <h2>Por departamento</h2>
                                    <p>Receita dos itens vendidos.</p>
                                </div>
                            </div>
                            {porDepartamento.length ? <Barras itens={porDepartamento} /> : <p className="a-sem-dados">Sem vendas no período.</p>}
                        </section>

                        <section className="a-cartao a-span-3">
                            <div className="a-cartao-topo">
                                <div>
                                    <h2>Pagamento</h2>
                                    <p>Como os clientes pagaram.</p>
                                </div>
                            </div>
                            {dados.porMetodo.length ? (
                                <ul className="a-metodos">
                                    {dados.porMetodo.map((m) => (
                                        <li key={m.rotulo}>
                                            <span className="a-legenda-cor" style={{ background: m.cor }} />
                                            <span>{m.rotulo}</span>
                                            <strong>{moedaCurta(m.valor)}</strong>
                                            <small>{Math.round((m.valor / dados.porMetodo.reduce((t, x) => t + x.valor, 0)) * 100)}%</small>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="a-sem-dados">Sem vendas no período.</p>
                            )}
                        </section>
                    </div>
                </>
            ) : null}

            <div className="a-painel-grade">
                <section className="a-cartao a-span-6">
                    <div className="a-cartao-topo">
                        <div>
                            <h2>Precisa de atenção</h2>
                            <p>O que a equipe deve olhar agora.</p>
                        </div>
                    </div>
                    {pendencias.length ? (
                        <ul className="a-atencoes">
                            {pendencias.map((p) => (
                                <Atencao key={p.texto} {...p} />
                            ))}
                        </ul>
                    ) : (
                        <p className="a-sem-dados ok">Tudo em dia: nenhuma reserva pendente, estoque ok e catálogo completo.</p>
                    )}
                </section>

                <section className="a-cartao a-span-6">
                    <div className="a-cartao-topo">
                        <div>
                            <h2>Últimas reservas</h2>
                            <p>As mais recentes primeiro.</p>
                        </div>
                        <a className="a-link" href="#/admin/reservas">
                            Abrir reservas
                        </a>
                    </div>
                    {!reservas ? (
                        <Carregando linhas={3} />
                    ) : reservas.length ? (
                        <ul className="a-ultimas">
                            {reservas.slice(0, 5).map((r) => (
                                <li key={r.numero}>
                                    <div>
                                        <strong>{r.cliente_nome}</strong>
                                        <small>
                                            <span className="a-mono">{r.numero}</span> · {dataHora(r.criado_em)} · {ROTULO_METODO[r.metodo] || r.metodo}
                                        </small>
                                    </div>
                                    <div className="a-ultimas-valor">
                                        <strong>{formatarPreco(Number(r.total))}</strong>
                                        <Selo tom={TOM_STATUS[r.status][1]}>{TOM_STATUS[r.status][0]}</Selo>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="a-sem-dados">Nenhuma reserva feita na loja ainda.</p>
                    )}
                </section>

                <section className="a-cartao a-span-5">
                    <div className="a-cartao-topo">
                        <div>
                            <h2>Catálogo</h2>
                            <p>{visiveis.length} produtos cadastrados.</p>
                        </div>
                        <a className="a-link" href="#/admin/produtos">
                            Gerenciar
                        </a>
                    </div>
                    <dl className="a-numeros">
                        <a href="#/admin/produtos/jogos">
                            <dt>Jogos</dt>
                            <dd>{visiveis.filter((p) => p.tipo === "jogo").length}</dd>
                        </a>
                        <a href="#/admin/produtos/acessorios">
                            <dt>Produtos</dt>
                            <dd>{visiveis.filter((p) => p.tipo === "acessorio").length}</dd>
                        </a>
                        <a href="#/admin/produtos">
                            <dt>Publicados</dt>
                            <dd>{publicados}</dd>
                        </a>
                        <a href="#/admin/promocoes">
                            <dt>Em promoção</dt>
                            <dd className="ouro">{emPromocao}</dd>
                        </a>
                    </dl>
                    <div className="a-barra-publicados" title={`${publicados} de ${visiveis.length} publicados`}>
                        <span style={{ width: `${visiveis.length ? (publicados / visiveis.length) * 100 : 0}%` }} />
                    </div>
                    <small className="a-texto-apagado">
                        {visiveis.length ? Math.round((publicados / visiveis.length) * 100) : 0}% do catálogo está publicado na loja
                    </small>
                </section>

                <section className="a-cartao a-span-7">
                    <div className="a-cartao-topo">
                        <div>
                            <h2>Atividades recentes</h2>
                            <p>Alterações feitas no painel.</p>
                        </div>
                        <a className="a-link" href="#/admin/historico">
                            Ver histórico
                        </a>
                    </div>
                    {!recentes && !erro ? (
                        <Carregando linhas={3} />
                    ) : recentes?.length ? (
                        <ul className="a-atividades">
                            {recentes.map((a) => (
                                <li key={a.id}>
                                    <span className="a-atividade-acao">{ROTULOS_ACAO[a.acao] || a.acao}</span>
                                    <span className="a-atividade-detalhe">{resumoDetalhes(a)}</span>
                                    <small>{dataHora(a.criado_em)}</small>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        !erro && <Vazio icone={IconeRelogio} titulo="Nenhuma ação registrada ainda" texto="Cadastros, preços, promoções, imagens e estoque alterados no painel aparecem aqui." />
                    )}
                </section>
            </div>
        </>
    );
}
