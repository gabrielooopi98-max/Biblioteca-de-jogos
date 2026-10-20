// Estoque dos produtos físicos (jogos não entram): saldo, aviso de estoque baixo, ajustes com motivo e movimentações.
import { useEffect, useMemo, useState } from "react";
import { IconeCaixa } from "../../componentes/comum/Icones.jsx";
import { normalizar } from "../../utilidades/funcoes.js";
import * as api from "../servicos/api.js";
import { Cabecalho, Campo, Carregando, ErroCarregar, Modal, Selo, Vazio } from "../componentes/ui.jsx";
import { dataHora, miniatura, useAdmin } from "../servicos/util.js";

function situacao(p) {
    if (!p.controla_estoque) return { rotulo: "Sem controle", tom: "neutro" };
    if (api.esgotado(p)) return { rotulo: "Esgotado", tom: "perigo" };
    if (api.estoqueBaixo(p)) return { rotulo: "Estoque baixo", tom: "aviso" };
    return { rotulo: "Em estoque", tom: "ok" };
}

function Ajuste({ produto, fechar }) {
    const { aposAlterar, avisar } = useAdmin();
    const atual = produto.controla_estoque ? (produto.estoque ?? 0) : 0;
    const [saldo, setSaldo] = useState(String(atual));
    const [motivo, setMotivo] = useState("");
    const [erro, setErro] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [movimentos, setMovimentos] = useState(null);

    useEffect(() => {
        let ativo = true;
        api.movimentosDeEstoque(produto.id)
            .then((m) => ativo && setMovimentos(m))
            .catch(() => ativo && setMovimentos([]));
        return () => {
            ativo = false;
        };
    }, [produto.id]);

    const novo = Number(saldo);
    const diferenca = Number.isInteger(novo) ? novo - atual : 0;

    async function salvar() {
        if (!/^\d+$/.test(saldo)) return setErro("Informe uma quantidade inteira, 0 ou mais.");
        setSalvando(true);
        try {
            await api.ajustarEstoque(produto.id, novo, motivo);
            avisar(`Estoque de "${produto.nome}": ${novo} ${novo === 1 ? "unidade" : "unidades"}.`);
            await aposAlterar();
            fechar();
        } catch (falha) {
            setErro(falha.message);
        } finally {
            setSalvando(false);
        }
    }

    return (
        <Modal
            titulo={`Estoque: ${produto.nome}`}
            fechar={fechar}
            rodape={
                <>
                    <button type="button" className="a-botao" onClick={fechar} disabled={salvando}>
                        Cancelar
                    </button>
                    <button type="button" className="a-botao primario" onClick={salvar} disabled={salvando}>
                        {salvando ? "Salvando…" : "Salvar estoque"}
                    </button>
                </>
            }
        >
            <div className="a-ajuste-estoque">
                <button type="button" className="a-botao" onClick={() => setSaldo(String(Math.max(0, (Number(saldo) || 0) - 1)))} aria-label="Menos uma unidade">
                    −
                </button>
                <Campo rotulo="Quantidade" erro={erro}>
                    {(id) => (
                        <input
                            id={id}
                            inputMode="numeric"
                            value={saldo}
                            onChange={(e) => {
                                setSaldo(e.target.value.replace(/\D/g, ""));
                                setErro("");
                            }}
                        />
                    )}
                </Campo>
                <button type="button" className="a-botao" onClick={() => setSaldo(String((Number(saldo) || 0) + 1))} aria-label="Mais uma unidade">
                    +
                </button>
            </div>
            <p className="a-texto-apagado">
                Atual: {produto.controla_estoque ? atual : "sem controle"}
                {diferenca !== 0 && ` · ${diferenca > 0 ? "+" : ""}${diferenca}`}
            </p>
            <Campo rotulo="Motivo" dica="Ex.: chegada de mercadoria, contagem, avaria (opcional).">
                {(id) => <input id={id} maxLength={120} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
            </Campo>
            <h3 className="a-subtitulo pequeno">Últimas movimentações</h3>
            {!movimentos ? (
                <Carregando linhas={3} />
            ) : movimentos.length === 0 ? (
                <p className="a-texto-apagado">Nenhuma movimentação ainda.</p>
            ) : (
                <ul className="a-movimentos">
                    {movimentos.map((m) => (
                        <li key={m.id}>
                            <span className={m.delta >= 0 ? "a-texto-ok" : "a-texto-aviso"}>
                                {m.delta >= 0 ? "+" : ""}
                                {m.delta}
                            </span>
                            <span>{m.motivo}</span>
                            <small>
                                saldo {m.saldo} · {dataHora(m.criado_em)}
                            </small>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
}

export default function Estoque() {
    const { produtos, erroDados, recarregar } = useAdmin();
    const [busca, setBusca] = useState("");
    const [filtro, setFiltro] = useState("");
    const [ajustando, setAjustando] = useState(null);

    const fisicos = useMemo(() => (produtos || []).filter((p) => p.tipo === "acessorio" && p.status !== "arquivado"), [produtos]);
    const lista = useMemo(() => {
        const termo = normalizar(busca);
        return fisicos.filter((p) => {
            if (termo && !normalizar(`${p.nome} ${p.marca || ""}`).includes(termo)) return false;
            if (filtro === "baixo") return api.estoqueBaixo(p);
            if (filtro === "esgotado") return api.esgotado(p);
            if (filtro === "sem-controle") return !p.controla_estoque;
            return true;
        });
    }, [fisicos, busca, filtro]);

    if (erroDados) return <ErroCarregar mensagem={erroDados} tentarDeNovo={recarregar} />;
    if (!produtos) return <Carregando linhas={6} />;

    const baixos = fisicos.filter(api.estoqueBaixo).length;
    const esgotados = fisicos.filter(api.esgotado).length;

    return (
        <>
            <Cabecalho titulo="Estoque" descricao="Só para produtos físicos. Cada reserva baixa uma unidade e o cancelamento devolve." />
            <div className="a-filtros">
                <input className="a-busca" type="search" placeholder="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar produto" />
                <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Situação">
                    <option value="">Todas as situações</option>
                    <option value="baixo">Estoque baixo ({baixos})</option>
                    <option value="esgotado">Esgotados ({esgotados})</option>
                    <option value="sem-controle">Sem controle de estoque</option>
                </select>
            </div>
            {lista.length === 0 ? (
                <Vazio icone={IconeCaixa} titulo="Nenhum produto aqui" texto={filtro ? "Nenhum produto nessa situação." : "Cadastre produtos físicos para controlar o estoque."} />
            ) : (
                <div className="a-tabela-rolagem">
                    <table className="a-tabela">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Quantidade</th>
                                <th>Aviso em</th>
                                <th>Situação</th>
                                <th>
                                    <span className="so-leitor">Ações</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {lista.map((p) => {
                                const s = situacao(p);
                                return (
                                    <tr key={p.id}>
                                        <td data-rotulo="Produto">
                                            <a className="a-produto-celula" href={`#/admin/produtos/${p.id}`}>
                                                <img src={miniatura(p)} alt="" loading="lazy" />
                                                <span>
                                                    <strong>{p.nome}</strong>
                                                    <small>{p.marca || "Sem marca"}</small>
                                                </span>
                                            </a>
                                        </td>
                                        <td data-rotulo="Quantidade">{p.controla_estoque ? `${p.estoque} un.` : "—"}</td>
                                        <td data-rotulo="Aviso em">{p.controla_estoque ? `${p.estoque_minimo} un.` : "—"}</td>
                                        <td data-rotulo="Situação">
                                            <Selo tom={s.tom}>{s.rotulo}</Selo>
                                        </td>
                                        <td className="a-acoes">
                                            <button type="button" className="a-botao" onClick={() => setAjustando(p)}>
                                                {p.controla_estoque ? "Ajustar" : "Controlar estoque"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {ajustando && <Ajuste produto={ajustando} fechar={() => setAjustando(null)} />}
        </>
    );
}
