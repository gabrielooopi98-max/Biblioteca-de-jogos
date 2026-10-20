// Lista de produtos do painel: busca, filtros, paginação e ações (editar, ver na loja, arquivar/reativar).
import { useMemo, useState } from "react";
import { IconeArquivo, IconeControle, IconeDesfazer, IconeEditar, IconeExterno, IconeMais } from "../components/Icones.jsx";
import { formatarPreco, normalizar } from "../utils.js";
import { SEM_IMAGEM } from "../catalogo.js";
import * as api from "./api.js";
import { Cabecalho, Carregando, Confirmacao, ErroCarregar, Paginacao, Selo, Vazio } from "./ui.jsx";
import { dataCurta, miniatura, STATUS_PRODUTO, useAdmin } from "./util.js";

const POR_PAGINA = 20;
// filtros que chegam pela URL (atalhos da visão geral)
const PREDEFINIDOS = {
    jogos: { tipo: "jogo" },
    acessorios: { tipo: "acessorio" },
    "nao-publicados": { status: "nao-publicados" },
    "sem-imagem": { especial: "sem-imagem" },
    promocao: { promocao: "vigente" },
};

const FILTROS_VAZIOS = { busca: "", tipo: "", categoria: "", plataforma: "", status: "", promocao: "", especial: "" };

export default function Produtos({ filtroInicial }) {
    const { produtos, categorias, erroDados, recarregar, aposAlterar, avisar } = useAdmin();
    const [filtros, setFiltros] = useState(() => ({ ...FILTROS_VAZIOS, ...(PREDEFINIDOS[filtroInicial] || {}) }));
    const [pagina, setPagina] = useState(0);
    const [arquivando, setArquivando] = useState(null);
    const [ocupado, setOcupado] = useState(false);

    const plataformas = useMemo(() => [...new Set((produtos || []).flatMap((p) => p.plataformas || []))].sort(), [produtos]);
    const nomeCategoria = (id) => categorias?.find((c) => c.id === id)?.nome || "Sem categoria";

    const lista = useMemo(() => {
        if (!produtos) return [];
        const termo = normalizar(filtros.busca);
        return produtos.filter((p) => {
            if (termo && !normalizar(`${p.nome} ${p.slug} ${p.marca || ""} ${p.desenvolvedora || ""} ${p.id}`).includes(termo)) return false;
            if (filtros.tipo && p.tipo !== filtros.tipo) return false;
            if (filtros.categoria && p.categoria_id !== filtros.categoria) return false;
            if (filtros.plataforma && !(p.plataformas || []).includes(filtros.plataforma)) return false;
            if (filtros.status === "nao-publicados" ? ["ativo", "arquivado"].includes(p.status) : filtros.status ? p.status !== filtros.status : p.status === "arquivado") return false;
            if (filtros.promocao && api.situacaoPromocao(p) !== filtros.promocao) return false;
            if (filtros.especial === "sem-imagem" && !api.semImagem(p)) return false;
            return true;
        });
    }, [produtos, filtros]);

    const mudar = (campo) => (e) => {
        setFiltros((f) => ({ ...f, [campo]: e.target.value }));
        setPagina(0);
    };

    async function confirmarArquivo() {
        const p = arquivando;
        setOcupado(true);
        try {
            const novo = p.status === "arquivado" ? "inativo" : "arquivado";
            await api.alterarProduto(p.id, { status: novo });
            avisar(novo === "arquivado" ? `"${p.nome}" foi arquivado e saiu da loja.` : `"${p.nome}" voltou como inativo. Publique quando quiser.`);
            setArquivando(null);
            await aposAlterar();
        } catch (e) {
            avisar(e.message, "erro");
        } finally {
            setOcupado(false);
        }
    }

    if (erroDados) return <ErroCarregar mensagem={erroDados} tentarDeNovo={recarregar} />;

    const visiveis = lista.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
    const filtrando = Object.entries(filtros).some(([k, v]) => v && k !== "busca") || filtros.busca;

    return (
        <>
            <Cabecalho titulo="Produtos" descricao="Jogos e produtos da loja. O que estiver publicado aparece na loja na hora.">
                <a className="a-botao primario" href="#/admin/produtos/novo">
                    <IconeMais tamanho={16} /> Novo produto
                </a>
            </Cabecalho>

            <div className="a-filtros">
                <input className="a-busca" type="search" placeholder="Buscar por nome, marca, estúdio ou código" value={filtros.busca} onChange={mudar("busca")} aria-label="Buscar produtos" />
                <select value={filtros.tipo} onChange={mudar("tipo")} aria-label="Tipo">
                    <option value="">Todos os tipos</option>
                    <option value="jogo">Jogos</option>
                    <option value="acessorio">Acessórios e produtos</option>
                </select>
                <select value={filtros.categoria} onChange={mudar("categoria")} aria-label="Categoria">
                    <option value="">Todas as categorias</option>
                    {(categorias || []).map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.nome}
                        </option>
                    ))}
                </select>
                <select value={filtros.plataforma} onChange={mudar("plataforma")} aria-label="Plataforma">
                    <option value="">Todas as plataformas</option>
                    {plataformas.map((p) => (
                        <option key={p}>{p}</option>
                    ))}
                </select>
                <select value={filtros.status} onChange={mudar("status")} aria-label="Publicação">
                    <option value="">Todos (menos arquivados)</option>
                    <option value="ativo">Publicados</option>
                    <option value="nao-publicados">Inativos e rascunhos</option>
                    <option value="inativo">Inativos</option>
                    <option value="rascunho">Rascunhos</option>
                    <option value="arquivado">Arquivados</option>
                </select>
                <select value={filtros.promocao} onChange={mudar("promocao")} aria-label="Promoção">
                    <option value="">Com ou sem promoção</option>
                    <option value="vigente">Em promoção agora</option>
                    <option value="agendada">Promoção agendada</option>
                    <option value="encerrada">Promoção encerrada</option>
                    <option value="sem">Sem promoção</option>
                </select>
                {filtros.especial === "sem-imagem" && <Selo tom="aviso">Só os sem imagem</Selo>}
                {filtrando && (
                    <button
                        type="button"
                        className="a-link"
                        onClick={() => {
                            setFiltros(FILTROS_VAZIOS);
                            setPagina(0);
                        }}
                    >
                        Limpar filtros
                    </button>
                )}
            </div>

            {!produtos ? (
                <Carregando linhas={8} />
            ) : lista.length === 0 ? (
                <Vazio
                    icone={IconeControle}
                    titulo={filtrando ? "Nenhum produto com esses filtros" : "Nenhum produto cadastrado"}
                    texto={filtrando ? "Mude a busca ou limpe os filtros." : "Cadastre o primeiro produto da loja."}
                    acao={
                        !filtrando && (
                            <a className="a-botao primario" href="#/admin/produtos/novo">
                                Novo produto
                            </a>
                        )
                    }
                />
            ) : (
                <>
                    <p className="a-contagem">
                        {lista.length} {lista.length === 1 ? "produto" : "produtos"}
                    </p>
                    <div className="a-tabela-rolagem">
                        <table className="a-tabela a-tabela-produtos">
                            <thead>
                                <tr>
                                    <th>Produto</th>
                                    <th>Tipo e categoria</th>
                                    <th>Preço</th>
                                    <th>Estoque</th>
                                    <th>Publicação</th>
                                    <th>Atualizado</th>
                                    <th>
                                        <span className="so-leitor">Ações</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {visiveis.map((p) => {
                                    const promo = api.situacaoPromocao(p);
                                    const status = STATUS_PRODUTO[p.status];
                                    return (
                                        <tr key={p.id}>
                                            <td data-rotulo="Produto">
                                                <a className="a-produto-celula" href={`#/admin/produtos/${p.id}`}>
                                                    <img src={miniatura(p)} alt="" loading="lazy" onError={(e) => (e.currentTarget.src = SEM_IMAGEM)} />
                                                    <span>
                                                        <strong>{p.nome}</strong>
                                                        <small>
                                                            #{p.id}
                                                            {api.semImagem(p) && " · sem imagem"}
                                                        </small>
                                                    </span>
                                                </a>
                                            </td>
                                            <td data-rotulo="Tipo e categoria">
                                                {p.tipo === "jogo" ? "Jogo" : "Produto"}
                                                <small className="a-bloco">{nomeCategoria(p.categoria_id)}</small>
                                            </td>
                                            <td data-rotulo="Preço" className="a-nao-quebra">
                                                {formatarPreco(api.precoAtual(p))}
                                                {promo === "vigente" && <Selo tom="ouro">-{api.percentualDesconto(Number(p.preco), Number(p.preco_promocional))}%</Selo>}
                                                {promo === "agendada" && <Selo tom="neutro">agendada</Selo>}
                                                {promo === "vigente" && <small className="a-bloco a-riscado">{formatarPreco(Number(p.preco))}</small>}
                                            </td>
                                            <td data-rotulo="Estoque">
                                                {!p.controla_estoque ? (
                                                    <span className="a-texto-apagado">—</span>
                                                ) : api.esgotado(p) ? (
                                                    <Selo tom="perigo">Esgotado</Selo>
                                                ) : (
                                                    <span className={api.estoqueBaixo(p) ? "a-texto-aviso" : ""}>{p.estoque} un.</span>
                                                )}
                                            </td>
                                            <td data-rotulo="Publicação">
                                                <Selo tom={status.tom}>{status.rotulo}</Selo>
                                            </td>
                                            <td data-rotulo="Atualizado" className="a-texto-apagado a-nao-quebra">
                                                {dataCurta(p.atualizado_em)}
                                            </td>
                                            <td className="a-acoes">
                                                <a className="a-icone-botao" href={`#/admin/produtos/${p.id}`} aria-label={`Editar ${p.nome}`} title="Editar">
                                                    <IconeEditar tamanho={17} />
                                                </a>
                                                {p.status === "ativo" && (
                                                    <a className="a-icone-botao" href={`#/${p.tipo === "jogo" ? "jogo" : "produto"}/${p.id}`} target="_blank" rel="noreferrer" aria-label={`Ver ${p.nome} na loja`} title="Ver na loja">
                                                        <IconeExterno tamanho={17} />
                                                    </a>
                                                )}
                                                <button type="button" className="a-icone-botao" onClick={() => setArquivando(p)} aria-label={p.status === "arquivado" ? `Reativar ${p.nome}` : `Arquivar ${p.nome}`} title={p.status === "arquivado" ? "Reativar" : "Arquivar"}>
                                                    {p.status === "arquivado" ? <IconeDesfazer tamanho={17} /> : <IconeArquivo tamanho={17} />}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <Paginacao pagina={pagina} total={lista.length} porPagina={POR_PAGINA} aoMudar={setPagina} />
                </>
            )}

            {arquivando && (
                <Confirmacao
                    titulo={arquivando.status === "arquivado" ? "Reativar produto?" : "Arquivar produto?"}
                    texto={
                        arquivando.status === "arquivado"
                            ? `"${arquivando.nome}" volta para a lista como inativo. Ele só aparece na loja depois que você publicar.`
                            : `"${arquivando.nome}" sai da loja, mas continua salvo com o histórico e as reservas antigas. Dá para reativar depois.`
                    }
                    rotulo={arquivando.status === "arquivado" ? "Reativar" : "Arquivar"}
                    perigo={arquivando.status !== "arquivado"}
                    ocupado={ocupado}
                    aoConfirmar={confirmarArquivo}
                    aoCancelar={() => setArquivando(null)}
                />
            )}
        </>
    );
}
