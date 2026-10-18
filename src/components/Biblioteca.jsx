import { useState } from "react";
import { navegar } from "../hooks.js";
import { useLoja } from "../LojaContext.js";
import { formatarData, formatarPreco, imagensDoJogo, normalizar } from "../utils.js";
import { Imagem, Plataformas } from "./CardJogo.jsx";
import { IconeBiblioteca, IconeCopiar, IconeOlho, IconeOlhoFechado } from "./Icones.jsx";

function ItemBiblioteca({ item }) {
    const { abrirJogo, notificar } = useLoja();
    const [visivel, setVisivel] = useState(false);
    const { jogo, chave, pedido, pago } = item;

    function copiar() {
        navigator.clipboard?.writeText(chave).then(
            () => notificar(`Chave de ${jogo.nome} copiada.`),
            () => notificar("Não foi possível copiar. Selecione a chave manualmente."),
        );
    }

    return (
        <article className="item-biblioteca">
            <button type="button" className="item-biblioteca-imagem" onClick={() => abrirJogo(jogo.id)} aria-label={`Ver ${jogo.nome}`}>
                <Imagem src={imagensDoJogo(jogo).horizontal} alt="" />
            </button>
            <div className="item-biblioteca-corpo">
                <button type="button" className="item-biblioteca-nome" onClick={() => abrirJogo(jogo.id)}>
                    {jogo.nome}
                </button>
                <span className="item-biblioteca-meta">
                    Comprado em {formatarData(pedido.data)} · {formatarPreco(pago)} · <a href="#/pedidos">{pedido.numero}</a>
                </span>
                <Plataformas lista={jogo.plataformas} />
                <div className="chave">
                    <code aria-label={visivel ? "Chave de ativação" : "Chave oculta"}>{visivel ? chave : chave.replace(/[A-Z0-9]/g, "•")}</code>
                    <button type="button" className="icone-botao" onClick={() => setVisivel((v) => !v)} aria-label={visivel ? "Ocultar chave" : "Mostrar chave"} data-dica={visivel ? "Ocultar chave" : "Mostrar chave"}>
                        {visivel ? <IconeOlhoFechado tamanho={16} /> : <IconeOlho tamanho={16} />}
                    </button>
                    <button type="button" className="icone-botao" onClick={copiar} aria-label="Copiar chave" data-dica="Copiar">
                        <IconeCopiar tamanho={16} />
                    </button>
                </div>
            </div>
        </article>
    );
}

function Biblioteca({ itens }) {
    const [busca, setBusca] = useState("");
    const termo = normalizar(busca);
    const filtrados = itens.filter((item) => !termo || normalizar(item.jogo.nome).includes(termo));
    const investido = itens.reduce((soma, item) => soma + item.pago, 0);
    const economizado = itens.reduce((soma, item) => soma + (item.jogo.preco - item.pago), 0);

    return (
        <div className="pagina">
            <div className="pagina-cabecalho">
                <div>
                    <h1>Biblioteca</h1>
                    <p>Seus jogos e chaves de ativação, sempre à mão.</p>
                </div>
            </div>

            {itens.length === 0 ? (
                <div className="vazio">
                    <IconeBiblioteca tamanho={30} />
                    <h3>Sua biblioteca está vazia</h3>
                    <p>Os jogos que você comprar aparecem aqui, com a chave de ativação.</p>
                    <button type="button" className="botao botao-primario" onClick={() => navegar("/explorar")}>
                        Explorar jogos
                    </button>
                </div>
            ) : (
                <>
                    <div className="estatisticas">
                        <div>
                            <span>Jogos</span>
                            <strong>{itens.length}</strong>
                        </div>
                        <div>
                            <span>Investido</span>
                            <strong>{formatarPreco(investido)}</strong>
                        </div>
                        <div>
                            <span>Economizado</span>
                            <strong>{formatarPreco(economizado)}</strong>
                        </div>
                    </div>
                    <input type="search" className="campo campo-busca" placeholder="Buscar na biblioteca" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar na biblioteca" />
                    <div className="lista-biblioteca">
                        {filtrados.map((item) => (
                            <ItemBiblioteca key={item.jogo.id} item={item} />
                        ))}
                        {filtrados.length === 0 && <p className="texto-apagado">Nenhum jogo da biblioteca corresponde a “{busca}”.</p>}
                    </div>
                </>
            )}
        </div>
    );
}

export default Biblioteca;
