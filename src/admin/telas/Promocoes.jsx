// Preços e promoções: vigentes, agendadas e encerradas; criar, editar e encerrar sem abrir o produto inteiro.
import { useMemo, useState } from "react";
import { IconeEtiqueta, IconeMais } from "../../componentes/comum/Icones.jsx";
import { formatarPreco, normalizar } from "../../utilidades/funcoes.js";
import * as api from "../servicos/api.js";
import { CamposPromocao } from "../componentes/CamposPromocao.jsx";
import { Cabecalho, Campo, Carregando, Confirmacao, ErroCarregar, Modal, Selo, Vazio } from "../componentes/ui.jsx";
import { dataHora, deCampoData, errosPromocao, lerPreco, miniatura, paraCampoData, useAdmin } from "../servicos/util.js";

const ABAS = [
    ["vigente", "Valendo agora"],
    ["agendada", "Agendadas"],
    ["encerrada", "Encerradas"],
];

function EditorPromocao({ produto, produtos, fechar }) {
    const { aposAlterar, avisar } = useAdmin();
    const [escolhido, setEscolhido] = useState(produto || null);
    const [busca, setBusca] = useState("");
    const inicial = (p) => ({
        preco: String(p.preco).replace(".", ","),
        promocao_ativa: true,
        preco_promocional: p.preco_promocional != null ? String(p.preco_promocional).replace(".", ",") : "",
        promocao_inicio: paraCampoData(p.promocao_inicio),
        promocao_fim: paraCampoData(p.promocao_fim),
    });
    const [valores, setValores] = useState(produto ? inicial(produto) : null);
    const [erros, setErros] = useState({});
    const [salvando, setSalvando] = useState(false);

    const opcoes = useMemo(() => {
        const termo = normalizar(busca);
        return produtos.filter((p) => p.status !== "arquivado" && (!termo || normalizar(p.nome).includes(termo))).slice(0, 8);
    }, [produtos, busca]);

    async function salvar() {
        const e = { ...errosPromocao(valores) };
        const preco = lerPreco(valores.preco);
        if (preco == null || Number.isNaN(preco) || preco < 0) e.preco = "Preço inválido.";
        setErros(e);
        if (Object.keys(e).length) return;
        setSalvando(true);
        try {
            await api.alterarProduto(escolhido.id, {
                preco,
                promocao_ativa: true,
                preco_promocional: lerPreco(valores.preco_promocional),
                promocao_inicio: deCampoData(valores.promocao_inicio),
                promocao_fim: deCampoData(valores.promocao_fim),
            });
            avisar(`Promoção de "${escolhido.nome}" salva.`);
            await aposAlterar();
            fechar();
        } catch (falha) {
            avisar(falha.message, "erro");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <Modal
            titulo={produto ? `Promoção: ${produto.nome}` : "Nova promoção"}
            fechar={fechar}
            largo
            rodape={
                valores && (
                    <>
                        <button type="button" className="a-botao" onClick={fechar} disabled={salvando}>
                            Cancelar
                        </button>
                        <button type="button" className="a-botao primario" onClick={salvar} disabled={salvando}>
                            {salvando ? "Salvando…" : "Salvar promoção"}
                        </button>
                    </>
                )
            }
        >
            {!escolhido ? (
                <>
                    <Campo rotulo="Produto">{(id) => <input id={id} type="search" placeholder="Buscar pelo nome" value={busca} onChange={(e) => setBusca(e.target.value)} />}</Campo>
                    <ul className="a-escolha-produto">
                        {opcoes.map((p) => (
                            <li key={p.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEscolhido(p);
                                        setValores(inicial(p));
                                    }}
                                >
                                    <img src={miniatura(p)} alt="" />
                                    <span>{p.nome}</span>
                                    <span className="a-texto-apagado">{formatarPreco(Number(p.preco))}</span>
                                </button>
                            </li>
                        ))}
                        {opcoes.length === 0 && <li className="a-texto-apagado">Nenhum produto encontrado.</li>}
                    </ul>
                </>
            ) : (
                <>
                    <div className="a-grade">
                        <Campo rotulo="Preço original (R$)" erro={erros.preco} largura={4}>
                            {(id) => <input id={id} inputMode="decimal" value={valores.preco} onChange={(e) => setValores((v) => ({ ...v, preco: e.target.value }))} />}
                        </Campo>
                    </div>
                    <CamposPromocao valores={valores} aoMudar={(p) => setValores((v) => ({ ...v, ...p }))} erros={erros} />
                </>
            )}
        </Modal>
    );
}

export default function Promocoes() {
    const { produtos, erroDados, recarregar, aposAlterar, avisar } = useAdmin();
    const [aba, setAba] = useState("vigente");
    const [editando, setEditando] = useState(null); // produto ou "nova"
    const [encerrando, setEncerrando] = useState(null);
    const [ocupado, setOcupado] = useState(false);

    if (erroDados) return <ErroCarregar mensagem={erroDados} tentarDeNovo={recarregar} />;
    if (!produtos) return <Carregando linhas={6} />;

    const porSituacao = (s) => produtos.filter((p) => p.status !== "arquivado" && api.situacaoPromocao(p) === s);
    const lista = porSituacao(aba);

    async function encerrar() {
        setOcupado(true);
        try {
            await api.alterarProduto(encerrando.id, { promocao_ativa: false });
            avisar(`Promoção de "${encerrando.nome}" encerrada. A loja volta a mostrar ${formatarPreco(Number(encerrando.preco))}.`);
            setEncerrando(null);
            await aposAlterar();
        } catch (e) {
            avisar(e.message, "erro");
        } finally {
            setOcupado(false);
        }
    }

    return (
        <>
            <Cabecalho titulo="Preços e promoções" descricao="O preço original nunca é apagado: a promoção vale só no período e depois a loja volta ao preço normal sozinha.">
                <button type="button" className="a-botao primario" onClick={() => setEditando("nova")}>
                    <IconeMais tamanho={16} /> Nova promoção
                </button>
            </Cabecalho>

            <div className="a-barra">
                <div className="a-segmentos" role="tablist" aria-label="Situação da promoção">
                    {ABAS.map(([id, rotulo]) => (
                        <button type="button" key={id} role="tab" aria-selected={aba === id} className={aba === id ? "ativo" : ""} onClick={() => setAba(id)}>
                            {rotulo} <span className="a-contagem-aba">{porSituacao(id).length}</span>
                        </button>
                    ))}
                </div>
            </div>

            {lista.length === 0 ? (
                <Vazio icone={IconeEtiqueta} titulo={aba === "vigente" ? "Nenhuma promoção valendo agora" : aba === "agendada" ? "Nenhuma promoção agendada" : "Nenhuma promoção encerrada"} texto="Crie uma promoção com início e fim para ela entrar e sair da loja sozinha." />
            ) : (
                <div className="a-tabela-rolagem">
                    <table className="a-tabela">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Preço</th>
                                <th>Desconto</th>
                                <th>Período</th>
                                <th>
                                    <span className="so-leitor">Ações</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {lista.map((p) => (
                                <tr key={p.id}>
                                    <td data-rotulo="Produto">
                                        <a className="a-produto-celula" href={`#/admin/produtos/${p.id}`}>
                                            <img src={miniatura(p)} alt="" loading="lazy" />
                                            <span>
                                                <strong>{p.nome}</strong>
                                                <small>{p.tipo === "jogo" ? "Jogo" : "Produto"}</small>
                                            </span>
                                        </a>
                                    </td>
                                    <td data-rotulo="Preço" className="a-nao-quebra">
                                        <span className="a-riscado">{formatarPreco(Number(p.preco))}</span> <strong>{formatarPreco(Number(p.preco_promocional))}</strong>
                                    </td>
                                    <td data-rotulo="Desconto">
                                        <Selo tom="ouro">-{api.percentualDesconto(Number(p.preco), Number(p.preco_promocional))}%</Selo>
                                    </td>
                                    <td data-rotulo="Período" className="a-texto-apagado">
                                        {p.promocao_inicio ? `de ${dataHora(p.promocao_inicio)}` : "desde já"} {p.promocao_fim ? `até ${dataHora(p.promocao_fim)}` : "sem data para acabar"}
                                    </td>
                                    <td className="a-acoes">
                                        <button type="button" className="a-botao" onClick={() => setEditando(p)}>
                                            Editar
                                        </button>
                                        {aba !== "encerrada" && (
                                            <button type="button" className="a-botao" onClick={() => setEncerrando(p)}>
                                                Encerrar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editando && <EditorPromocao produto={editando === "nova" ? null : editando} produtos={produtos} fechar={() => setEditando(null)} />}
            {encerrando && (
                <Confirmacao
                    titulo="Encerrar promoção?"
                    texto={`"${encerrando.nome}" volta para ${formatarPreco(Number(encerrando.preco))} na loja agora. O preço promocional fica guardado caso queira reativar.`}
                    rotulo="Encerrar agora"
                    ocupado={ocupado}
                    aoConfirmar={encerrar}
                    aoCancelar={() => setEncerrando(null)}
                />
            )}
        </>
    );
}
