// Vendas por produto: unidades, receita, preço médio, reservado em aberto e última venda,
// com filtro de período, busca, ordenação e exportação em planilha (CSV).
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconeDownload, IconeRecibo } from "../../componentes/comum/Icones.jsx";
import { formatarPreco, normalizar } from "../../utilidades/funcoes.js";
import * as api from "../servicos/api.js";
import { Barras } from "../componentes/graficos.jsx";
import { Cabecalho, Carregando, ErroCarregar, Vazio } from "../componentes/ui.jsx";
import { dataCurta, miniatura, useAdmin } from "../servicos/util.js";
import { CORES, intervalo, PERIODOS, resumo, vendasPorProduto } from "../servicos/vendas.js";

const OPCOES_PERIODO = [...PERIODOS, { id: "tudo", rotulo: "Tudo" }];
const COLUNAS = [
    ["nome", "Produto"],
    ["unidades", "Unidades"],
    ["receita", "Receita"],
    ["medio", "Preço médio"],
    ["participacao", "% da receita"],
    ["emAberto", "Em aberto"],
    ["ultima", "Última venda"],
];

function baixarCsv(linhas, nomeArquivo) {
    const celula = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const texto = linhas.map((l) => l.map(celula).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`﻿${texto}`], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: nomeArquivo });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Vendas() {
    const { produtos, categorias } = useAdmin();
    const [reservas, setReservas] = useState(null);
    const [erro, setErro] = useState("");
    const [periodo, setPeriodo] = useState("30d");
    const [tipo, setTipo] = useState("");
    const [busca, setBusca] = useState("");
    const [ordem, setOrdem] = useState({ coluna: "receita", desc: true });

    const carregar = useCallback(async () => {
        try {
            setReservas(await api.reservasParaRelatorio(null));
            setErro("");
        } catch (e) {
            setErro(e.message);
        }
    }, []);

    useEffect(() => {
        carregar();
    }, [carregar]);

    const porId = useMemo(() => new Map((produtos || []).map((p) => [p.id, p])), [produtos]);
    const nomeCategoria = useMemo(() => new Map((categorias || []).map((c) => [c.id, c.nome])), [categorias]);

    const { linhas, totais, faixa } = useMemo(() => {
        if (!reservas) return { linhas: [], totais: null, faixa: null };
        const faixa = periodo === "tudo" ? { inicio: null, fim: new Date() } : intervalo(periodo);
        const todas = vendasPorProduto(reservas, faixa.inicio, faixa.fim);
        const receitaTotal = todas.reduce((s, l) => s + l.receita, 0);
        const termo = normalizar(busca);
        const linhas = todas
            .map((l) => {
                const p = porId.get(l.produtoId);
                return { ...l, produto: p, departamento: nomeCategoria.get(p?.categoria_id) || "—", medio: l.unidades ? l.receita / l.unidades : 0, participacao: receitaTotal ? l.receita / receitaTotal : 0 };
            })
            .filter((l) => (!tipo || l.tipo === tipo) && (!termo || normalizar(`${l.nome} ${l.departamento}`).includes(termo)));
        const fator = ordem.desc ? -1 : 1;
        linhas.sort((a, b) => {
            const va = a[ordem.coluna] ?? (ordem.coluna === "ultima" ? 0 : "");
            const vb = b[ordem.coluna] ?? (ordem.coluna === "ultima" ? 0 : "");
            return (typeof va === "string" ? va.localeCompare(vb, "pt-BR") : va - vb) * fator;
        });
        const totais = {
            ...resumo(reservas, faixa.inicio || new Date(0), faixa.fim),
            unidades: linhas.reduce((s, l) => s + l.unidades, 0),
            receitaItens: linhas.reduce((s, l) => s + l.receita, 0),
            emAberto: linhas.reduce((s, l) => s + l.emAberto, 0),
            produtosVendidos: linhas.filter((l) => l.unidades > 0).length,
        };
        return { linhas, totais, faixa };
    }, [reservas, periodo, tipo, busca, ordem, porId, nomeCategoria]);

    if (erro) return <ErroCarregar mensagem={erro} tentarDeNovo={carregar} />;
    if (!reservas || !produtos) return <Carregando linhas={6} texto="Carregando vendas" />;

    function ordenar(coluna) {
        setOrdem((o) => (o.coluna === coluna ? { coluna, desc: !o.desc } : { coluna, desc: coluna !== "nome" }));
    }

    function exportar() {
        const cabecalho = ["Produto", "Código", "Tipo", "Departamento", "Unidades vendidas", "Receita (R$)", "Preço médio (R$)", "% da receita", "Reservado em aberto", "Última venda"];
        const dinheiro = (v) => v.toFixed(2).replace(".", ",");
        const corpo = linhas.map((l) => [
            l.nome,
            l.produtoId ?? "",
            l.tipo === "jogo" ? "Jogo" : "Produto",
            l.departamento,
            l.unidades,
            dinheiro(l.receita),
            dinheiro(l.medio),
            `${(l.participacao * 100).toFixed(1).replace(".", ",")}%`,
            l.emAberto,
            l.ultima ? l.ultima.toLocaleDateString("pt-BR") : "",
        ]);
        const hoje = new Date().toISOString().slice(0, 10);
        baixarCsv([cabecalho, ...corpo], `vendas-universal-games-${periodo}-${hoje}.csv`);
    }

    const top = linhas.filter((l) => l.receita > 0).slice(0, 5);
    const descricaoPeriodo = periodo === "tudo" ? "desde a primeira reserva" : `de ${faixa.inicio.toLocaleDateString("pt-BR")} até hoje`;

    return (
        <>
            <Cabecalho titulo="Vendas" descricao={`Saldo de vendas de cada produto ${descricaoPeriodo}. Contam as reservas confirmadas pela loja ou já retiradas.`}>
                <button type="button" className="a-botao" onClick={exportar} disabled={!linhas.length}>
                    <IconeDownload tamanho={16} /> Exportar planilha
                </button>
            </Cabecalho>

            <div className="a-filtros">
                <div className="a-segmentos" role="tablist" aria-label="Período">
                    {OPCOES_PERIODO.map((p) => (
                        <button key={p.id} type="button" role="tab" aria-selected={periodo === p.id} className={periodo === p.id ? "ativo" : ""} onClick={() => setPeriodo(p.id)}>
                            {p.rotulo}
                        </button>
                    ))}
                </div>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de produto">
                    <option value="">Jogos e produtos</option>
                    <option value="jogo">Só jogos</option>
                    <option value="acessorio">Só produtos</option>
                </select>
                <input className="a-busca" type="search" placeholder="Buscar produto ou departamento" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
            </div>

            <section className="a-kpis compacto" aria-label="Totais do período">
                <div className="a-kpi destaque">
                    <span className="a-kpi-rotulo">Receita das reservas</span>
                    <strong className="a-kpi-valor">{formatarPreco(totais.receita)}</strong>
                    <small>já com cupons e desconto do Pix</small>
                </div>
                <div className="a-kpi">
                    <span className="a-kpi-rotulo">Unidades vendidas</span>
                    <strong className="a-kpi-valor">{totais.unidades.toLocaleString("pt-BR")}</strong>
                    <small>{totais.produtosVendidos} produtos diferentes</small>
                </div>
                <div className="a-kpi">
                    <span className="a-kpi-rotulo">Vendas</span>
                    <strong className="a-kpi-valor">{totais.vendas.toLocaleString("pt-BR")}</strong>
                    <small>ticket médio {formatarPreco(totais.ticket)}</small>
                </div>
                <div className="a-kpi">
                    <span className="a-kpi-rotulo">Reservado em aberto</span>
                    <strong className="a-kpi-valor">{totais.emAberto.toLocaleString("pt-BR")}</strong>
                    <small>unidades aguardando a loja</small>
                </div>
            </section>

            {top.length > 0 && (
                <section className="a-cartao">
                    <div className="a-cartao-topo">
                        <div>
                            <h2>Ranking por receita</h2>
                            <p>Os 5 que mais venderam no período.</p>
                        </div>
                    </div>
                    <Barras itens={top.map((l, i) => ({ chave: l.id, posicao: true, rotulo: l.nome, valor: l.receita, cor: CORES[i % CORES.length], detalhe: `${l.unidades} un. · ${(l.participacao * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da receita` }))} />
                </section>
            )}

            {linhas.length ? (
                <>
                    <p className="a-contagem">
                        {linhas.length} {linhas.length === 1 ? "produto" : "produtos"} · valores pelo preço de cada item na reserva
                    </p>
                    <div className="a-tabela-rolagem">
                        <table className="a-tabela a-tabela-vendas">
                            <thead>
                                <tr>
                                    {COLUNAS.map(([id, rotulo]) => (
                                        <th key={id} aria-sort={ordem.coluna === id ? (ordem.desc ? "descending" : "ascending") : undefined} className={id === "nome" ? "" : "num"}>
                                            <button type="button" className="a-ordenar" onClick={() => ordenar(id)}>
                                                {rotulo}
                                                <span aria-hidden="true">{ordem.coluna === id ? (ordem.desc ? "↓" : "↑") : ""}</span>
                                            </button>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {linhas.map((l) => (
                                    <tr key={l.id}>
                                        <td data-rotulo="Produto">
                                            {l.produto ? (
                                                <a className="a-produto-celula" href={`#/admin/produtos/${l.produtoId}`}>
                                                    <img src={miniatura(l.produto)} alt="" loading="lazy" />
                                                    <span>
                                                        <strong>{l.nome}</strong>
                                                        <small>
                                                            {l.tipo === "jogo" ? "Jogo" : "Produto"} · {l.departamento}
                                                        </small>
                                                    </span>
                                                </a>
                                            ) : (
                                                <span className="a-produto-celula">
                                                    <span>
                                                        <strong>{l.nome}</strong>
                                                        <small>produto apagado do catálogo</small>
                                                    </span>
                                                </span>
                                            )}
                                        </td>
                                        <td data-rotulo="Unidades" className="num">
                                            {l.unidades}
                                        </td>
                                        <td data-rotulo="Receita" className="num">
                                            <strong>{formatarPreco(l.receita)}</strong>
                                        </td>
                                        <td data-rotulo="Preço médio" className="num">
                                            {l.unidades ? formatarPreco(l.medio) : "—"}
                                        </td>
                                        <td data-rotulo="% da receita" className="num">
                                            <span className="a-participacao">
                                                <span className="a-participacao-trilho">
                                                    <span style={{ width: `${l.participacao * 100}%` }} />
                                                </span>
                                                {(l.participacao * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                                            </span>
                                        </td>
                                        <td data-rotulo="Em aberto" className="num">
                                            {l.emAberto ? <span className="a-texto-aviso">{l.emAberto}</span> : <span className="a-texto-apagado">0</span>}
                                        </td>
                                        <td data-rotulo="Última venda" className="num">
                                            {l.ultima ? dataCurta(l.ultima.toISOString()) : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td data-rotulo="Total">
                                        <strong>Total</strong>
                                    </td>
                                    <td data-rotulo="Unidades" className="num">
                                        {totais.unidades}
                                    </td>
                                    <td data-rotulo="Receita" className="num">
                                        <strong>{formatarPreco(totais.receitaItens)}</strong>
                                    </td>
                                    <td className="num a-some-celular" />
                                    <td className="num a-some-celular" />
                                    <td data-rotulo="Em aberto" className="num">
                                        {totais.emAberto}
                                    </td>
                                    <td className="num a-some-celular" />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            ) : (
                <Vazio
                    icone={IconeRecibo}
                    titulo={busca || tipo ? "Nenhum produto com esse filtro" : "Nenhuma venda neste período"}
                    texto={busca || tipo ? "Tente outro termo ou limpe os filtros." : "Quando a loja confirmar reservas em Reservas, os produtos vendidos aparecem aqui com unidades e receita."}
                />
            )}
        </>
    );
}
