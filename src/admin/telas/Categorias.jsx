// Categorias (departamentos da loja): criar, editar, ativar/desativar, ordenar e remover as vazias.
import { useState } from "react";
import { IconeEditar, IconeLista, IconeLixeira, IconeMais, IconeSetaBaixo, IconeSetaCima } from "../../componentes/comum/Icones.jsx";
import * as api from "../servicos/api.js";
import { Cabecalho, Campo, Carregando, Confirmacao, ErroCarregar, Interruptor, Modal, Selo, Vazio } from "../componentes/ui.jsx";
import { paraSlug, useAdmin } from "../servicos/util.js";

function EditorCategoria({ categoria, categorias, fechar }) {
    const { aposAlterar, avisar } = useAdmin();
    const [valores, setValores] = useState(categoria ? { ...categoria, descricao: categoria.descricao || "" } : { id: "", nome: "", descricao: "", tipo: "produto", ativa: true });
    const [idManual, setIdManual] = useState(Boolean(categoria));
    const [erros, setErros] = useState({});
    const [salvando, setSalvando] = useState(false);

    async function salvar() {
        const e = {};
        if (valores.nome.trim().length < 2) e.nome = "Informe o nome.";
        if (!/^[a-z0-9-]{2,40}$/.test(valores.id)) e.id = "Use letras minúsculas, números e hífens.";
        else if (!categoria && categorias.some((c) => c.id === valores.id)) e.id = "Já existe uma categoria com esse código.";
        setErros(e);
        if (Object.keys(e).length) return;
        setSalvando(true);
        try {
            const dados = { nome: valores.nome.trim(), descricao: valores.descricao.trim() || null, tipo: valores.tipo, ativa: valores.ativa };
            await api.salvarCategoria(categoria ? dados : { ...dados, id: valores.id, ordem: categorias.length }, categoria?.id);
            avisar(categoria ? `Categoria "${dados.nome}" salva.` : `Categoria "${dados.nome}" criada.`);
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
            titulo={categoria ? `Editar: ${categoria.nome}` : "Nova categoria"}
            fechar={fechar}
            rodape={
                <>
                    <button type="button" className="a-botao" onClick={fechar} disabled={salvando}>
                        Cancelar
                    </button>
                    <button type="button" className="a-botao primario" onClick={salvar} disabled={salvando}>
                        {salvando ? "Salvando…" : "Salvar"}
                    </button>
                </>
            }
        >
            <Campo rotulo="Nome" erro={erros.nome}>
                {(id) => (
                    <input
                        id={id}
                        maxLength={60}
                        value={valores.nome}
                        onChange={(e) => setValores((v) => ({ ...v, nome: e.target.value, id: idManual ? v.id : paraSlug(e.target.value).slice(0, 40) }))}
                    />
                )}
            </Campo>
            <Campo rotulo="Código" erro={erros.id} dica={categoria ? "O código não muda depois de criado." : "Usado internamente; gerado pelo nome."}>
                {(id) => (
                    <input
                        id={id}
                        value={valores.id}
                        disabled={Boolean(categoria)}
                        onChange={(e) => {
                            setIdManual(true);
                            setValores((v) => ({ ...v, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }));
                        }}
                    />
                )}
            </Campo>
            <Campo rotulo="Descrição" dica="Aparece embaixo do nome na loja (opcional).">
                {(id) => <input id={id} maxLength={200} value={valores.descricao} onChange={(e) => setValores((v) => ({ ...v, descricao: e.target.value }))} />}
            </Campo>
            <Campo rotulo="Tipo">
                {(id) => (
                    <select id={id} value={valores.tipo} onChange={(e) => setValores((v) => ({ ...v, tipo: e.target.value }))} disabled={Boolean(categoria)}>
                        <option value="produto">Produtos (departamento da loja)</option>
                        <option value="jogo">Jogos</option>
                    </select>
                )}
            </Campo>
            <Interruptor marcado={valores.ativa} aoMudar={(ativa) => setValores((v) => ({ ...v, ativa }))} rotulo="Ativa" descricao="Desativada, some da loja junto com os produtos dela." />
        </Modal>
    );
}

export default function Categorias() {
    const { categorias, produtos, erroDados, recarregar, aposAlterar, avisar } = useAdmin();
    const [editando, setEditando] = useState(null);
    const [removendo, setRemovendo] = useState(null);
    const [ocupado, setOcupado] = useState(false);

    if (erroDados) return <ErroCarregar mensagem={erroDados} tentarDeNovo={recarregar} />;
    if (!categorias || !produtos) return <Carregando linhas={6} />;

    const contagem = (id) => produtos.filter((p) => p.categoria_id === id && p.status !== "arquivado").length;

    async function executar(acao, sucesso) {
        setOcupado(true);
        try {
            await acao();
            if (sucesso) avisar(sucesso);
            await aposAlterar();
        } catch (e) {
            avisar(e.message, "erro");
        } finally {
            setOcupado(false);
        }
    }

    const mover = (i, passo) => {
        const ids = categorias.map((c) => c.id);
        [ids[i], ids[i + passo]] = [ids[i + passo], ids[i]];
        executar(() => api.reordenarCategorias(ids));
    };

    return (
        <>
            <Cabecalho titulo="Categorias" descricao="Os departamentos da loja, na ordem em que aparecem nos atalhos e nas abas.">
                <button type="button" className="a-botao primario" onClick={() => setEditando("nova")}>
                    <IconeMais tamanho={16} /> Nova categoria
                </button>
            </Cabecalho>

            {categorias.length === 0 ? (
                <Vazio icone={IconeLista} titulo="Nenhuma categoria" texto="Crie a primeira categoria para organizar os produtos." />
            ) : (
                <ol className="a-lista-ordenada" aria-busy={ocupado}>
                    {categorias.map((c, i) => (
                        <li key={c.id} className={c.ativa ? "" : "inativa"}>
                            <div className="a-ordem">
                                <button type="button" className="a-icone-botao" onClick={() => mover(i, -1)} disabled={i === 0 || ocupado} aria-label={`Subir ${c.nome}`}>
                                    <IconeSetaCima tamanho={16} />
                                </button>
                                <button type="button" className="a-icone-botao" onClick={() => mover(i, 1)} disabled={i === categorias.length - 1 || ocupado} aria-label={`Descer ${c.nome}`}>
                                    <IconeSetaBaixo tamanho={16} />
                                </button>
                            </div>
                            <div className="a-lista-info">
                                <strong>
                                    {c.nome} {c.tipo === "jogo" && <Selo>Jogos</Selo>} {!c.ativa && <Selo tom="aviso">Inativa</Selo>}
                                </strong>
                                <small>
                                    {c.descricao || "Sem descrição"} · {contagem(c.id)} {contagem(c.id) === 1 ? "produto" : "produtos"}
                                </small>
                            </div>
                            <Interruptor
                                marcado={c.ativa}
                                desativado={ocupado}
                                aoMudar={(ativa) => executar(() => api.salvarCategoria({ ativa }, c.id), ativa ? `"${c.nome}" voltou para a loja.` : `"${c.nome}" saiu da loja com os produtos dela.`)}
                                rotulo={c.ativa ? "Ativa" : "Inativa"}
                            />
                            <div className="a-acoes">
                                <button type="button" className="a-icone-botao" onClick={() => setEditando(c)} aria-label={`Editar ${c.nome}`} title="Editar">
                                    <IconeEditar tamanho={17} />
                                </button>
                                <button
                                    type="button"
                                    className="a-icone-botao"
                                    onClick={() => setRemovendo(c)}
                                    disabled={produtos.some((p) => p.categoria_id === c.id)}
                                    aria-label={`Remover ${c.nome}`}
                                    title={produtos.some((p) => p.categoria_id === c.id) ? "Tem produtos: desative em vez de remover" : "Remover"}
                                >
                                    <IconeLixeira tamanho={17} />
                                </button>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            {editando && <EditorCategoria categoria={editando === "nova" ? null : editando} categorias={categorias} fechar={() => setEditando(null)} />}
            {removendo && (
                <Confirmacao
                    titulo="Remover categoria?"
                    texto={`"${removendo.nome}" não tem produtos e será removida.`}
                    rotulo="Remover"
                    perigo
                    ocupado={ocupado}
                    aoConfirmar={() => executar(() => api.removerCategoria(removendo.id), `Categoria "${removendo.nome}" removida.`).then(() => setRemovendo(null))}
                    aoCancelar={() => setRemovendo(null)}
                />
            )}
        </>
    );
}
