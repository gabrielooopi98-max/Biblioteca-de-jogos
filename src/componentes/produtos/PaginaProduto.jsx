// Página de um produto: foto, caixa de compra, descrição, ficha técnica e sugestões.
import { MARCA_ACESSORIOS, nomeDaCategoria } from "../../dados/produtos.js";
import { imagensDoJogo } from "../../utilidades/funcoes.js";
import { NotaProduto, ProdutoCard } from "./Acessorios.jsx";
import CaixaCompra from "./CaixaCompra.jsx";
import { Imagem } from "../comum/CardJogo.jsx";
import { IconeCheck } from "../comum/Icones.jsx";

// Página de um produto: foto grande, caixa de compra (igual à dos jogos), descrição, ficha técnica e sugestões.
function PaginaProduto({ produto, acessorios, comprarAgora }) {
    const parecidos = [...acessorios.filter((a) => a.id !== produto.id && a.categoria === produto.categoria), ...acessorios.filter((a) => a.categoria !== produto.categoria)].slice(0, 5);
    const marca = produto.marca || MARCA_ACESSORIOS;

    return (
        <div className="pagina pagina-produto">
            <nav className="trilha" aria-label="Você está em">
                <a href="#/acessorios">Produtos</a>
                <span>/</span>
                <span>{nomeDaCategoria(produto.categoria)}</span>
                <span>/</span>
                <span aria-current="page">{produto.nome}</span>
            </nav>

            <div className="produto-layout">
                <div className="produto-vitrine">
                    <Imagem src={imagensDoJogo(produto).capa} alt={produto.nome} loading="eager" fetchPriority="high" />
                    {produto.desconto > 0 && <span className="selo">-{produto.desconto}%</span>}
                </div>

                <aside className="produto-compra">
                    <span className="produto-marca">
                        {marca} · {nomeDaCategoria(produto.categoria)}
                    </span>
                    <h1>{produto.nome}</h1>
                    <NotaProduto produto={produto} completa />
                    <CaixaCompra item={produto} comprarAgora={comprarAgora} extras={false} />
                </aside>
            </div>

            <section className="secao produto-detalhes">
                <div>
                    <h2 className="titulo-secao">Sobre o produto</h2>
                    <p className="produto-descricao">{produto.descricao}</p>
                    {produto.compatibilidade?.length > 0 && (
                        <>
                            <h3 className="produto-subtitulo">Compatível com</h3>
                            <div className="tags">
                                {produto.compatibilidade.map((c) => (
                                    <span key={c} className="tag">
                                        {c}
                                    </span>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <div>
                    <h2 className="titulo-secao">Ficha técnica</h2>
                    <dl className="ficha-lista">
                        <div>
                            <dt>Marca</dt>
                            <dd>{marca}</dd>
                        </div>
                        {produto.modelo && (
                            <div>
                                <dt>Modelo</dt>
                                <dd>{produto.modelo}</dd>
                            </div>
                        )}
                        <div>
                            <dt>Categoria</dt>
                            <dd>{nomeDaCategoria(produto.categoria)}</dd>
                        </div>
                    </dl>
                    {produto.especificacoes.length > 0 && (
                        <ul className="produto-specs">
                            {produto.especificacoes.map((e) => (
                                <li key={e}>
                                    <IconeCheck tamanho={14} /> {e}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            <section className="secao">
                <div className="secao-topo">
                    <h2 className="titulo-secao">Você também pode gostar</h2>
                </div>
                <div className="produtos grade-relacionados">
                    {parecidos.map((p) => (
                        <ProdutoCard key={p.id} produto={p} />
                    ))}
                </div>
            </section>
        </div>
    );
}

export default PaginaProduto;
