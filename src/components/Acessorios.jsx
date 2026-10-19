import { useState } from "react";
import { navegar, useIndicador } from "../hooks.js";
import { useLoja } from "../LojaContext.js";
import { CATEGORIAS_ACESSORIOS, nomeDaCategoria } from "../acessorios.js";
import { calcularPrecoFinal, FRETE, formatarPreco, GARANTIA_MESES, imagensDoJogo, PRAZO_ENTREGA } from "../utils.js";
import { Imagem, Preco } from "./CardJogo.jsx";
import { IconeCaminhao, IconeCarrinho, IconeCheck, IconeDesfazer, IconeEscudo, IconeEstrela } from "./Icones.jsx";

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

export function ProdutoCard({ produto }) {
    const { abrirJogo, adicionarAoCarrinho, estaNoCarrinho } = useLoja();
    const imagens = imagensDoJogo(produto);
    const noCarrinho = estaNoCarrinho(produto.id);
    const freteGratis = calcularPrecoFinal(produto) >= FRETE.gratisAPartirDe;

    return (
        <article className="produto">
            <button type="button" className="produto-imagem" onClick={() => abrirJogo(produto.id)} aria-label={`Ver ${produto.nome}`}>
                <Imagem src={imagens.capa} alt={produto.nome} />
                {produto.desconto > 0 && <span className="selo">-{produto.desconto}%</span>}
                {freteGratis && <span className="produto-frete">Frete grátis</span>}
            </button>
            <div className="produto-corpo">
                <span className="produto-categoria">
                    {nomeDaCategoria(produto.categoria)} · {produto.compatibilidade.slice(0, 3).join(", ")}
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
                        aria-label={noCarrinho ? `${produto.nome} já está no carrinho` : `Adicionar ${produto.nome} ao carrinho`}
                        data-dica={noCarrinho ? "No carrinho" : "Adicionar"}
                    >
                        {noCarrinho ? <IconeCheck tamanho={15} /> : <IconeCarrinho tamanho={15} />}
                    </button>
                </div>
            </div>
        </article>
    );
}

// Abas de categoria (Todos + categorias), com o fundo que desliza até a aba sob o mouse.
function AbasCategoria({ categoria, setCategoria, contagem }) {
    const ref = useIndicador();
    return (
        <div className="segmentos" ref={ref} role="tablist" aria-label="Categorias de acessórios">
            {[{ id: "todos", nome: "Todos" }, ...CATEGORIAS_ACESSORIOS].map((c) => (
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
                <IconeCaminhao tamanho={18} />
                <span>
                    <strong>Frete grátis</strong> acima de {formatarPreco(FRETE.gratisAPartirDe)}
                </span>
            </li>
            <li>
                <IconeEscudo tamanho={18} />
                <span>
                    <strong>Garantia de {GARANTIA_MESES} meses</strong> em todos os acessórios
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

// Vitrine da página inicial: 8 acessórios da categoria escolhida.
export function VitrineAcessorios({ acessorios }) {
    const [categoria, setCategoria] = useState("todos");
    const lista = maisRelevantes(categoria === "todos" ? acessorios : acessorios.filter((a) => a.categoria === categoria)).slice(0, 8);

    return (
        <section className="secao vitrine-acessorios" aria-labelledby="titulo-acessorios">
            <div className="secao-topo">
                <div>
                    <h2 className="titulo-secao" id="titulo-acessorios">
                        Acessórios
                    </h2>
                    <p className="descricao-secao">Periféricos, controles e tudo para jogar melhor no PC, no console e no celular.</p>
                </div>
                <div className="secao-acoes">
                    <button type="button" className="link-mais" onClick={() => navegar("/acessorios")}>
                        Ver todos os {acessorios.length}
                    </button>
                </div>
            </div>
            <AbasCategoria categoria={categoria} setCategoria={setCategoria} />
            <div className="produtos" key={categoria}>
                {lista.map((produto) => (
                    <ProdutoCard key={produto.id} produto={produto} />
                ))}
            </div>
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

// Página "Acessórios": abas por categoria, ordenação e a grade completa.
function PaginaAcessorios({ acessorios }) {
    const [categoria, setCategoria] = useState("todos");
    const [ordem, setOrdem] = useState("relevancia");
    const filtrados = categoria === "todos" ? acessorios : acessorios.filter((a) => a.categoria === categoria);
    const lista = ORDENS[ordem].ordenar(filtrados);
    const contagem = Object.fromEntries([["todos", acessorios.length], ...CATEGORIAS_ACESSORIOS.map((c) => [c.id, acessorios.filter((a) => a.categoria === c.id).length])]);

    return (
        <div className="pagina">
            <header className="pagina-cabecalho">
                <div>
                    <h1>Acessórios</h1>
                    <p>Mouse, teclado, headset, controles e o que mais você precisa para jogar melhor. Linha própria Universal Gear, com garantia e entrega para todo o Brasil.</p>
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
                <span className="texto-apagado">Entrega em {PRAZO_ENTREGA}</span>
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
