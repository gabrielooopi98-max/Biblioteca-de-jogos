// Gaveta lateral do carrinho: itens, cupom, resumo dos valores e sugestões em oferta.
import { useState } from "react";
import { usePresenca, useTeclaEsc } from "../../utilidades/hooks.js";
import { useLoja } from "../../utilidades/LojaContext.js";
import { calcularParcelas, CUPONS, ehAcessorio, formatarPreco, imagensDoJogo, resumirCarrinho } from "../../utilidades/funcoes.js";
import { Imagem, Preco } from "../comum/CardJogo.jsx";
import { IconeCadeado, IconeCarrinho, IconeCoracao, IconeEtiqueta, IconeFechar, IconeLixeira, IconeLoja } from "../comum/Icones.jsx";

function Gaveta({ aberta, fechar, titulo, children, rodape }) {
    const { montado, saindo } = usePresenca(aberta);
    useTeclaEsc(aberta, fechar);
    if (!montado) return null;

    return (
        <div className={saindo ? "gaveta-fundo saindo" : "gaveta-fundo"} onClick={fechar}>
            <aside className="gaveta" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
                <div className="gaveta-topo">
                    <h2>{titulo}</h2>
                    <button type="button" className="icone-botao" onClick={fechar} aria-label="Fechar">
                        <IconeFechar tamanho={18} />
                    </button>
                </div>
                <div className="gaveta-corpo">{children}</div>
                {rodape && <div className="gaveta-rodape">{rodape}</div>}
            </aside>
        </div>
    );
}

export function GavetaCarrinho({ aberta, fechar, itens, sugestoes, cupom, setCupom, irParaCheckout }) {
    const { abrirJogo, removerDoCarrinho, alternarDesejo, estaNosDesejos, adicionarAoCarrinho } = useLoja();
    const [codigo, setCodigo] = useState("");
    const [erroCupom, setErroCupom] = useState("");
    const resumo = resumirCarrinho(itens, cupom);
    const parcelas = calcularParcelas(resumo.total);

    function aplicarCupom(evento) {
        evento.preventDefault();
        const normalizado = codigo.trim().toUpperCase();
        if (CUPONS[normalizado]) {
            setCupom(normalizado);
            setCodigo("");
            setErroCupom("");
        } else {
            setErroCupom("Cupom inválido ou expirado.");
        }
    }

    const rodape = itens.length > 0 && (
        <>
            {cupom ? (
                <div className="cupom-aplicado">
                    <IconeEtiqueta tamanho={15} />
                    <span>
                        <strong className="mono">{cupom}</strong> · {CUPONS[cupom].descricao}
                    </span>
                    <button type="button" className="link-mais" onClick={() => setCupom(null)}>
                        Remover
                    </button>
                </div>
            ) : (
                <form className="cupom-form" onSubmit={aplicarCupom}>
                    <input
                        type="text"
                        className="campo mono"
                        placeholder="Cupom de desconto"
                        value={codigo}
                        onChange={(e) => {
                            setCodigo(e.target.value);
                            setErroCupom("");
                        }}
                        aria-label="Cupom de desconto"
                        aria-invalid={Boolean(erroCupom)}
                    />
                    <button type="submit" className="botao botao-secundario" disabled={!codigo.trim()}>
                        Aplicar
                    </button>
                    {erroCupom && <span className="erro-campo">{erroCupom}</span>}
                </form>
            )}

            <dl className="resumo">
                <div>
                    <dt>Subtotal</dt>
                    <dd>{formatarPreco(resumo.subtotal)}</dd>
                </div>
                {resumo.descontos > 0 && (
                    <div>
                        <dt>Descontos</dt>
                        <dd>-{formatarPreco(resumo.descontos)}</dd>
                    </div>
                )}
                {resumo.valorCupom > 0 && (
                    <div>
                        <dt>Cupom</dt>
                        <dd>-{formatarPreco(resumo.valorCupom)}</dd>
                    </div>
                )}
                <div>
                    <dt>Retirada na loja</dt>
                    <dd>Grátis</dd>
                </div>
                <div className="resumo-total">
                    <dt>Total</dt>
                    <dd>
                        {formatarPreco(resumo.total)}
                        <small>
                            ou {parcelas.quantidade}x de {formatarPreco(parcelas.valor)}
                        </small>
                    </dd>
                </div>
            </dl>
            <p className="retirada-aviso">
                <IconeLoja tamanho={16} />
                <span>
                    Pague pelo site ou na hora de retirar e <strong>busque na loja</strong> quando o pedido estiver pronto.
                </span>
            </p>
            <button type="button" className="botao botao-primario botao-largo botao-grande" onClick={irParaCheckout}>
                <IconeCadeado tamanho={16} /> Finalizar reserva
            </button>
        </>
    );

    return (
        <Gaveta aberta={aberta} fechar={fechar} titulo={`Carrinho${itens.length ? ` · ${itens.length}` : ""}`} rodape={rodape}>
            {itens.length === 0 ? (
                <>
                    <div className="vazio compacto">
                        <IconeCarrinho tamanho={28} />
                        <h3>Seu carrinho está vazio</h3>
                        <p>Que tal começar pelas ofertas?</p>
                    </div>
                    {sugestoes.length > 0 && (
                        <div className="sugestoes">
                            <h3 className="titulo-secao">Ofertas para você</h3>
                            {sugestoes.map((jogo) => (
                                <div key={jogo.id} className="item-carrinho">
                                    <button type="button" className="item-carrinho-imagem" onClick={() => abrirJogo(jogo.id)} aria-label={`Ver ${jogo.nome}`}>
                                        <Imagem src={imagensDoJogo(jogo).horizontal} alt="" />
                                    </button>
                                    <div className="item-carrinho-info">
                                        <span className="item-carrinho-nome">{jogo.nome}</span>
                                        <Preco jogo={jogo} tamanho="pequeno" />
                                    </div>
                                    <button type="button" className="icone-botao borda" onClick={() => adicionarAoCarrinho(jogo)} aria-label={`Adicionar ${jogo.nome}`}>
                                        <IconeCarrinho tamanho={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="lista-carrinho">
                    {itens.map((jogo) => (
                        <div key={jogo.id} className="item-carrinho">
                            <button type="button" className="item-carrinho-imagem" onClick={() => abrirJogo(jogo.id)} aria-label={`Ver ${jogo.nome}`}>
                                <Imagem src={imagensDoJogo(jogo).horizontal} alt="" />
                            </button>
                            <div className="item-carrinho-info">
                                <button type="button" className="item-carrinho-nome" onClick={() => abrirJogo(jogo.id)}>
                                    {jogo.nome}
                                </button>
                                <Preco jogo={jogo} tamanho="pequeno" />
                                <div className="item-carrinho-acoes">
                                    {!ehAcessorio(jogo) && !estaNosDesejos(jogo.id) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                alternarDesejo(jogo);
                                                removerDoCarrinho(jogo.id);
                                            }}
                                        >
                                            <IconeCoracao tamanho={13} /> Mover para desejos
                                        </button>
                                    )}
                                    <button type="button" onClick={() => removerDoCarrinho(jogo.id)}>
                                        <IconeLixeira tamanho={13} /> Remover
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Gaveta>
    );
}
