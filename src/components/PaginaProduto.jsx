import { MARCA_ACESSORIOS, nomeDaCategoria } from "../acessorios.js";
import { useLoja } from "../LojaContext.js";
import { calcularParcelas, calcularPrecoFinal, DESCONTO_PIX, FRETE, formatarPreco, GARANTIA_MESES, imagensDoJogo, PRAZO_ENTREGA } from "../utils.js";
import { Beneficios, NotaProduto, ProdutoCard } from "./Acessorios.jsx";
import { Imagem, Preco } from "./CardJogo.jsx";
import { IconeCaminhao, IconeCarrinho, IconeCheck, IconeEscudo } from "./Icones.jsx";

// Página de um acessório: foto grande, compra com entrega e garantia, especificações e sugestões.
function PaginaProduto({ produto, acessorios, comprarAgora }) {
    const { adicionarAoCarrinho, estaNoCarrinho } = useLoja();
    const final = calcularPrecoFinal(produto);
    const parcelas = calcularParcelas(final);
    const noCarrinho = estaNoCarrinho(produto.id);
    const freteGratis = final >= FRETE.gratisAPartirDe;
    const parecidos = [...acessorios.filter((a) => a.id !== produto.id && a.categoria === produto.categoria), ...acessorios.filter((a) => a.categoria !== produto.categoria)].slice(0, 4);

    return (
        <div className="pagina pagina-produto">
            <nav className="trilha" aria-label="Você está em">
                <a href="#/acessorios">Acessórios</a>
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
                        {MARCA_ACESSORIOS} · {nomeDaCategoria(produto.categoria)}
                    </span>
                    <h1>{produto.nome}</h1>
                    <NotaProduto produto={produto} completa />

                    <Preco jogo={produto} tamanho="grande" />
                    <p className="produto-parcelas">
                        {parcelas.quantidade}x de {formatarPreco(parcelas.valor)} sem juros · {formatarPreco(final * (1 - DESCONTO_PIX / 100))} no Pix
                    </p>

                    <ul className="produto-entrega">
                        <li>
                            <IconeCaminhao tamanho={17} />
                            <span>
                                {freteGratis ? (
                                    <>
                                        <strong>Frete grátis</strong> para todo o Brasil
                                    </>
                                ) : (
                                    <>
                                        Frete de <strong>{formatarPreco(FRETE.valor)}</strong> (grátis acima de {formatarPreco(FRETE.gratisAPartirDe)} em acessórios)
                                    </>
                                )}
                                <small>Chega em {PRAZO_ENTREGA}</small>
                            </span>
                        </li>
                        <li>
                            <IconeEscudo tamanho={17} />
                            <span>
                                Garantia de <strong>{GARANTIA_MESES} meses</strong>
                                <small>Troca em até 7 dias se não gostar</small>
                            </span>
                        </li>
                    </ul>

                    <div className="produto-botoes">
                        <button type="button" className="botao botao-primario botao-grande botao-largo" onClick={() => comprarAgora(produto)}>
                            Comprar agora
                        </button>
                        <button type="button" className="botao botao-secundario botao-grande botao-largo" onClick={() => adicionarAoCarrinho(produto)}>
                            {noCarrinho ? <IconeCheck tamanho={16} /> : <IconeCarrinho tamanho={16} />}
                            {noCarrinho ? "No carrinho" : "Adicionar ao carrinho"}
                        </button>
                    </div>
                </aside>
            </div>

            <section className="secao produto-detalhes">
                <div>
                    <h2 className="titulo-secao">Sobre o produto</h2>
                    <p className="produto-descricao">{produto.descricao}</p>
                    <h3 className="produto-subtitulo">Compatível com</h3>
                    <div className="tags">
                        {produto.compatibilidade.map((c) => (
                            <span key={c} className="tag">
                                {c}
                            </span>
                        ))}
                    </div>
                </div>
                <div>
                    <h2 className="titulo-secao">Especificações</h2>
                    <ul className="produto-specs">
                        {produto.especificacoes.map((e) => (
                            <li key={e}>
                                <IconeCheck tamanho={14} /> {e}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <Beneficios />

            <section className="secao">
                <div className="secao-topo">
                    <h2 className="titulo-secao">Você também pode gostar</h2>
                </div>
                <div className="produtos">
                    {parecidos.map((p) => (
                        <ProdutoCard key={p.id} produto={p} />
                    ))}
                </div>
            </section>
        </div>
    );
}

export default PaginaProduto;
