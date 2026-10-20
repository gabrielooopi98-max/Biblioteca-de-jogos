// Lista de desejos: jogos salvos pelo cliente, com alerta quando o preço chegar ao valor escolhido.
import { useState } from "react";
import { navegar } from "../../utilidades/hooks.js";
import { useLoja } from "../../utilidades/LojaContext.js";
import { calcularPrecoFinal, formatarPreco, imagensDoJogo } from "../../utilidades/funcoes.js";
import { Avaliacao, Imagem, Preco } from "../comum/CardJogo.jsx";
import { IconeCarrinho, IconeCheck, IconeCoracao, IconeFechar, IconeSino } from "../comum/Icones.jsx";

function AlertaPreco({ jogo, alvo, definir }) {
    const [editando, setEditando] = useState(false);
    const [valor, setValor] = useState(alvo ? String(alvo) : "");
    const atingido = alvo && calcularPrecoFinal(jogo) <= alvo;

    if (editando) {
        return (
            <form
                className="alerta-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    const numero = Number(valor.replace(",", "."));
                    definir(numero > 0 ? numero : null);
                    setEditando(false);
                }}
            >
                <span className="alerta-prefixo">R$</span>
                <input autoFocus inputMode="decimal" className="campo" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" aria-label="Preço-alvo" />
                <button type="submit" className="botao botao-primario">
                    Salvar
                </button>
                <button type="button" className="icone-botao" onClick={() => setEditando(false)} aria-label="Cancelar">
                    <IconeFechar tamanho={15} />
                </button>
            </form>
        );
    }

    return (
        <div className={atingido ? "alerta atingido" : "alerta"}>
            <IconeSino tamanho={14} />
            {alvo ? (
                <>
                    <span>
                        {atingido ? "Preço-alvo atingido" : "Avisar abaixo de"} <strong className="mono">{formatarPreco(alvo)}</strong>
                    </span>
                    <button type="button" onClick={() => setEditando(true)}>
                        Editar
                    </button>
                    <button type="button" onClick={() => definir(null)}>
                        Remover
                    </button>
                </>
            ) : (
                <button type="button" onClick={() => setEditando(true)}>
                    Criar alerta de preço
                </button>
            )}
        </div>
    );
}

function Desejos({ itens, alertas, definirAlerta }) {
    const { abrirJogo, adicionarAoCarrinho, alternarDesejo, estaNoCarrinho } = useLoja();
    const totalAtual = itens.reduce((soma, jogo) => soma + calcularPrecoFinal(jogo), 0);
    const economia = itens.reduce((soma, jogo) => soma + (jogo.preco - calcularPrecoFinal(jogo)), 0);

    return (
        <div className="pagina">
            <div className="pagina-cabecalho">
                <div>
                    <h1>Lista de desejos</h1>
                    <p>Acompanhe preços e receba um aviso quando um jogo chegar ao valor que você quer pagar.</p>
                </div>
            </div>

            {itens.length === 0 ? (
                <div className="vazio">
                    <IconeCoracao tamanho={30} />
                    <h3>Sua lista está vazia</h3>
                    <p>Use o coração nos jogos para acompanhá-los aqui.</p>
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
                            <span>Total hoje</span>
                            <strong>{formatarPreco(totalAtual)}</strong>
                        </div>
                        <div>
                            <span>Em descontos agora</span>
                            <strong>{formatarPreco(economia)}</strong>
                        </div>
                    </div>
                    <div className="lista-desejos">
                        {itens.map((jogo) => {
                            const noCarrinho = estaNoCarrinho(jogo.id);
                            return (
                                <article key={jogo.id} className="desejo">
                                    <button type="button" className="desejo-imagem" onClick={() => abrirJogo(jogo.id)} aria-label={`Ver ${jogo.nome}`}>
                                        <Imagem src={imagensDoJogo(jogo).horizontal} alt="" />
                                    </button>
                                    <div className="desejo-info">
                                        <button type="button" className="desejo-nome" onClick={() => abrirJogo(jogo.id)}>
                                            {jogo.nome}
                                        </button>
                                        <Avaliacao nota={jogo.nota} />
                                        <AlertaPreco jogo={jogo} alvo={alertas[jogo.id]} definir={(valor) => definirAlerta(jogo, valor)} />
                                    </div>
                                    <div className="desejo-acoes">
                                        <Preco jogo={jogo} />
                                        <button type="button" className={noCarrinho ? "botao botao-secundario ativo" : "botao botao-primario"} onClick={() => adicionarAoCarrinho(jogo)}>
                                            {noCarrinho ? <IconeCheck tamanho={15} /> : <IconeCarrinho tamanho={15} />}
                                            {noCarrinho ? "No carrinho" : "Adicionar"}
                                        </button>
                                        <button type="button" className="botao botao-fantasma" onClick={() => alternarDesejo(jogo)}>
                                            Remover
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

export default Desejos;
