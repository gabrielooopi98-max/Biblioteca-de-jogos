// Produtos físicos: card de produto, vitrines e departamentos da página inicial e a página "Produtos".
import { useState } from "react";
import { useIndicador } from "../../utilidades/hooks.js";
import { useLoja } from "../../utilidades/LojaContext.js";
import { CATEGORIAS_ACESSORIOS, nomeDaCategoria } from "../../dados/produtos.js";
import { calcularPrecoFinal, DIAS_PARA_RETIRAR, GARANTIA_MESES, imagensDoJogo } from "../../utilidades/funcoes.js";
import { Imagem, Preco } from "../comum/CardJogo.jsx";
import { IconeCarrinho, IconeCheck, IconeDesfazer, IconeEscudo, IconeEstrela, IconeLoja, IconeSetaDireita } from "../comum/Icones.jsx";

// Nota de 0 a 10 (igual aos jogos) exibida em estrelas de 0 a 5, como nas lojas de produtos.
export function NotaProduto({ produto, completa = false }) {
    return (
        <span className="produto-nota" aria-label={`Avaliação ${(produto.nota / 2).toFixed(1)} de 5, ${produto.avaliacoes} avaliações`}>
            <IconeEstrela tamanho={13} preenchido />
            <strong>{(produto.nota / 2).toFixed(1).replace(".", ",")}</strong>
            <small>
                ({produto.avaliacoes.toLocaleString("pt-BR")}
                {completa ? " avaliações" : ""})
            </small>
        </span>
    );
}

// Esgotado ou últimas unidades (só para produtos com estoque controlado pelo painel)
export function EtiquetaEstoque({ produto }) {
    if (produto.esgotado) return <span className="produto-estoque esgotado">Esgotado</span>;
    if (produto.estoque != null && produto.estoque <= 3) return <span className="produto-estoque">{produto.estoque === 1 ? "Última unidade" : `Últimas ${produto.estoque} unidades`}</span>;
    return null;
}

export function ProdutoCard({ produto }) {
    const { abrirJogo, adicionarAoCarrinho, estaNoCarrinho } = useLoja();
    const imagens = imagensDoJogo(produto);
    const noCarrinho = estaNoCarrinho(produto.id);

    return (
        <article className="produto">
            <button type="button" className="produto-imagem" onClick={() => abrirJogo(produto.id)} aria-label={`Ver ${produto.nome}`}>
                <Imagem src={imagens.capa} alt={produto.nome} />
                {produto.desconto > 0 && <span className="selo">-{produto.desconto}%</span>}
                <EtiquetaEstoque produto={produto} />
            </button>
            <div className="produto-corpo">
                <span className="produto-categoria">
                    {[nomeDaCategoria(produto.categoria), produto.compatibilidade?.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}
                </span>
                <button type="button" className="produto-nome" onClick={() => abrirJogo(produto.id)}>
                    {produto.nome}
                </button>
                <NotaProduto produto={produto} />
                <div className="produto-rodape">
                    <Preco jogo={produto} />
                    <button
                        type="button"
                        className={noCarrinho ? "cartao-carrinho ativo" : "cartao-carrinho"}
                        onClick={() => adicionarAoCarrinho(produto)}
                        disabled={produto.esgotado}
                        aria-label={produto.esgotado ? `${produto.nome} esgotado` : noCarrinho ? `${produto.nome} já está no carrinho` : `Adicionar ${produto.nome} ao carrinho`}
                        data-dica={produto.esgotado ? "Esgotado" : noCarrinho ? "No carrinho" : "Adicionar"}
                    >
                        {noCarrinho ? <IconeCheck tamanho={15} /> : <IconeCarrinho tamanho={15} />}
                    </button>
                </div>
            </div>
        </article>
    );
}

// Abas de departamento (Todos + departamentos), com o fundo que desliza até a aba sob o mouse.
function AbasCategoria({ categoria, setCategoria, contagem, categorias = CATEGORIAS_ACESSORIOS }) {
    const ref = useIndicador();
    return (
        <div className="segmentos" ref={ref} role="tablist" aria-label="Departamentos">
            {[{ id: "todos", nome: "Todos" }, ...categorias].map((c) => (
                <button type="button" key={c.id} role="tab" aria-selected={categoria === c.id} className={categoria === c.id ? "segmento ativo" : "segmento"} onClick={() => setCategoria(c.id)}>
                    {c.nome}
                    {contagem && <span className="segmento-contagem">{contagem[c.id]}</span>}
                </button>
            ))}
        </div>
    );
}

export function Beneficios() {
    return (
        <ul className="beneficios">
            <li>
                <IconeLoja tamanho={18} />
                <span>
                    <strong>Retire na loja</strong> em até {DIAS_PARA_RETIRAR} dias após a confirmação
                </span>
            </li>
            <li>
                <IconeEscudo tamanho={18} />
                <span>
                    <strong>Garantia de {GARANTIA_MESES} meses</strong> em todos os produtos
                </span>
            </li>
            <li>
                <IconeDesfazer tamanho={18} />
                <span>
                    <strong>Troca em 7 dias</strong> sem burocracia
                </span>
            </li>
        </ul>
    );
}

const maisRelevantes = (lista) => [...lista].sort((a, b) => b.nota * Math.log(b.avaliacoes) - a.nota * Math.log(a.avaliacoes));

// "Todos" mistura os departamentos (um de cada, em rodízio) para a vitrine não ficar só com um tipo de produto.
function intercalar(listas, quantidade) {
    const filas = listas.map((l) => [...l]);
    const saida = [];
    while (saida.length < quantidade && filas.some((f) => f.length)) for (const f of filas) if (f.length && saida.length < quantidade) saida.push(f.shift());
    return saida;
}

// Vitrine da página inicial: 8 produtos dos departamentos escolhidos, com abas.
export function VitrineAcessorios({ acessorios, id = "produtos", titulo, descricao, departamentos, aoVerTodos }) {
    const [categoria, setCategoria] = useState("todos");
    const categorias = departamentos ? CATEGORIAS_ACESSORIOS.filter((c) => departamentos.includes(c.id)) : CATEGORIAS_ACESSORIOS;
    const daCategoria = (c) => maisRelevantes(acessorios.filter((a) => a.categoria === c));
    const lista = categoria === "todos" ? intercalar(categorias.map((c) => daCategoria(c.id)), 8) : daCategoria(categoria).slice(0, 8);
    const total = acessorios.filter((a) => categorias.some((c) => c.id === a.categoria)).length;

    return (
        <section className="secao vitrine-acessorios" id={id} aria-labelledby={`titulo-${id}`}>
            <div className="secao-topo">
                <div>
                    <h2 className="titulo-secao" id={`titulo-${id}`}>
                        {titulo}
                    </h2>
                    <p className="descricao-secao">{descricao}</p>
                </div>
                <div className="secao-acoes">
                    <button type="button" className="link-mais" onClick={() => aoVerTodos(categoria)}>
                        Ver todos os {categoria === "todos" ? total : daCategoria(categoria).length}
                    </button>
                </div>
            </div>
            <AbasCategoria categoria={categoria} setCategoria={setCategoria} categorias={categorias} />
            <div className="produtos" key={categoria}>
                {lista.map((produto) => (
                    <ProdutoCard key={produto.id} produto={produto} />
                ))}
            </div>
        </section>
    );
}

// Atalhos da página inicial: um quadro por departamento (os jogos primeiro), com a ilustração do produto mais relevante.
export function Departamentos({ acessorios, capasJogos = [], totalJogos, aoEscolher }) {
    const quadros = [
        { id: "jogos", nome: "Jogos", detalhe: `${totalJogos} títulos`, capas: capasJogos.slice(0, 3) },
        ...CATEGORIAS_ACESSORIOS.map((c) => {
            const lista = maisRelevantes(acessorios.filter((a) => a.categoria === c.id));
            return { id: c.id, nome: c.nome, detalhe: `${lista.length} ${lista.length === 1 ? "produto" : "produtos"}`, imagem: lista[0] && imagensDoJogo(lista[0]).capa };
        }),
    ];

    return (
        <section className="secao departamentos" aria-labelledby="titulo-departamentos">
            <div className="secao-topo">
                <div>
                    <h2 className="titulo-secao" id="titulo-departamentos">
                        Departamentos
                    </h2>
                    <p className="descricao-secao">Jogos, celulares, video games, som, TV e muito mais em um só lugar.</p>
                </div>
            </div>
            <ul className="departamentos-lista">
                {quadros.map((q) => (
                    <li key={q.id}>
                        <button type="button" className={q.capas ? "departamento jogos" : "departamento"} onClick={() => aoEscolher(q.id)}>
                            <span className="departamento-imagem">
                                {q.capas ? (
                                    // jogos: três capas em leque, como numa prateleira
                                    <span className="departamento-leque">
                                        {q.capas.map((src) => (
                                            <Imagem key={src} src={src} alt="" />
                                        ))}
                                    </span>
                                ) : (
                                    q.imagem && <Imagem src={q.imagem} alt="" />
                                )}
                            </span>
                            <span className="departamento-texto">
                                <strong>{q.nome}</strong>
                                <small>
                                    {q.detalhe}
                                    <IconeSetaDireita tamanho={13} />
                                </small>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}

const ORDENS = {
    relevancia: { rotulo: "Mais relevantes", ordenar: maisRelevantes },
    "menor-preco": { rotulo: "Menor preço", ordenar: (l) => [...l].sort((a, b) => calcularPrecoFinal(a) - calcularPrecoFinal(b)) },
    "maior-preco": { rotulo: "Maior preço", ordenar: (l) => [...l].sort((a, b) => calcularPrecoFinal(b) - calcularPrecoFinal(a)) },
    "maior-desconto": { rotulo: "Maior desconto", ordenar: (l) => [...l].sort((a, b) => b.desconto - a.desconto) },
    "melhor-avaliados": { rotulo: "Mais bem avaliados", ordenar: (l) => [...l].sort((a, b) => b.nota - a.nota) },
};

// Página "Produtos": abas por departamento, ordenação e a grade completa.
// O departamento vem do App: a vitrine e os atalhos da loja abrem a página já filtrada.
function PaginaAcessorios({ acessorios, categoria, setCategoria }) {
    const [ordem, setOrdem] = useState("relevancia");
    const filtrados = categoria === "todos" ? acessorios : acessorios.filter((a) => a.categoria === categoria);
    const lista = ORDENS[ordem].ordenar(filtrados);
    const contagem = Object.fromEntries([["todos", acessorios.length], ...CATEGORIAS_ACESSORIOS.map((c) => [c.id, acessorios.filter((a) => a.categoria === c.id).length])]);

    return (
        <div className="pagina">
            <header className="pagina-cabecalho">
                <div>
                    <h1>Produtos</h1>
                    <p>Celulares, tablets, video games, som, TV, acessórios e muito mais. Reserve pelo site e retire na loja, com garantia.</p>
                </div>
            </header>

            <Beneficios />

            <div className="acessorios-barra">
                <AbasCategoria categoria={categoria} setCategoria={setCategoria} contagem={contagem} />
                <select className="campo seletor" value={ordem} onChange={(e) => setOrdem(e.target.value)} aria-label="Ordenar por">
                    {Object.entries(ORDENS).map(([valor, { rotulo }]) => (
                        <option key={valor} value={valor}>
                            {rotulo}
                        </option>
                    ))}
                </select>
            </div>

            <p className="catalogo-resumo">
                <span>
                    <strong>{lista.length}</strong> {lista.length === 1 ? "produto" : "produtos"}
                    {categoria !== "todos" && ` em ${nomeDaCategoria(categoria)}`}
                </span>
                <span className="texto-apagado">Retirada na loja</span>
            </p>

            <div className="produtos" key={`${categoria}-${ordem}`}>
                {lista.map((produto) => (
                    <ProdutoCard key={produto.id} produto={produto} />
                ))}
            </div>
        </div>
    );
}

export default PaginaAcessorios;
