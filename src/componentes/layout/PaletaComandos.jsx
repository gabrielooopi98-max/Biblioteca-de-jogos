// Busca rápida (Ctrl+K ou /): encontra jogos, produtos e páginas sem sair de onde está.
import { useEffect, useRef, useState } from "react";
import { usePresenca, useTeclaEsc } from "../../utilidades/hooks.js";
import { useLoja } from "../../utilidades/LojaContext.js";
import { imagensDoJogo, normalizar } from "../../utilidades/funcoes.js";
import { Preco } from "../comum/CardJogo.jsx";
import { IconeBusca, IconeSeta } from "../comum/Icones.jsx";

function PaletaComandos({ aberta, fechar, jogos, comandos }) {
    const { abrirJogo } = useLoja();
    const { montado, saindo } = usePresenca(aberta, 150);
    const [consulta, setConsulta] = useState("");
    const [ativo, setAtivo] = useState(0);
    const [estavaAberta, setEstavaAberta] = useState(aberta);
    const listaRef = useRef(null);

    if (aberta !== estavaAberta) {
        setEstavaAberta(aberta);
        if (aberta) {
            setConsulta("");
            setAtivo(0);
        }
    }

    useTeclaEsc(aberta, fechar);

    const termo = normalizar(consulta);
    const jogosEncontrados = (termo ? jogos.filter((j) => normalizar(`${j.nome} ${j.desenvolvedora} ${j.generos.join(" ")}`).includes(termo)) : [...jogos].sort((a, b) => b.nota - a.nota)).slice(0, termo ? 7 : 4);
    const comandosEncontrados = comandos.filter((c) => !termo || normalizar(`${c.rotulo} ${c.dica || ""}`).includes(termo));

    const itens = [
        ...jogosEncontrados.map((jogo) => ({ tipo: "jogo", chave: `j${jogo.id}`, jogo, executar: () => abrirJogo(jogo.id) })),
        ...comandosEncontrados.map((comando) => ({ tipo: "comando", chave: comando.id, comando, executar: comando.executar })),
    ];
    const indice = Math.min(ativo, Math.max(itens.length - 1, 0));

    useEffect(() => {
        listaRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    }, [indice]);

    if (!montado) return null;

    function executar(item) {
        fechar();
        item.executar();
    }

    function aoTeclar(evento) {
        if (evento.key === "ArrowDown") {
            evento.preventDefault();
            setAtivo((i) => Math.min(i + 1, itens.length - 1));
        } else if (evento.key === "ArrowUp") {
            evento.preventDefault();
            setAtivo((i) => Math.max(i - 1, 0));
        } else if (evento.key === "Enter" && itens[indice]) {
            evento.preventDefault();
            executar(itens[indice]);
        }
    }

    const renderizarItem = (item, posicao) => (
        <button
            type="button"
            key={item.chave}
            role="option"
            aria-selected={posicao === indice}
            className={posicao === indice ? "paleta-item ativo" : "paleta-item"}
            onMouseMove={() => setAtivo(posicao)}
            onClick={() => executar(item)}
        >
            {item.tipo === "jogo" ? (
                <>
                    <img src={imagensDoJogo(item.jogo).horizontal} alt="" className="paleta-capa" loading="lazy" />
                    <span className="paleta-texto">
                        <strong>{item.jogo.nome}</strong>
                        <small>
                            {item.jogo.desenvolvedora} · {item.jogo.generos.slice(0, 2).join(", ")}
                        </small>
                    </span>
                    <Preco jogo={item.jogo} tamanho="pequeno" />
                </>
            ) : (
                <>
                    <span className="paleta-icone">
                        <item.comando.Icone tamanho={16} />
                    </span>
                    <span className="paleta-texto">
                        <strong>{item.comando.rotulo}</strong>
                        {item.comando.dica && <small>{item.comando.dica}</small>}
                    </span>
                    <IconeSeta tamanho={15} className="paleta-seta" />
                </>
            )}
        </button>
    );

    return (
        <div className={saindo ? "paleta-fundo saindo" : "paleta-fundo"} onMouseDown={fechar}>
            <div className="paleta" role="dialog" aria-modal="true" aria-label="Buscar e navegar" onMouseDown={(e) => e.stopPropagation()}>
                <div className="paleta-campo">
                    <IconeBusca tamanho={18} />
                    <input
                        autoFocus
                        value={consulta}
                        onChange={(e) => {
                            setConsulta(e.target.value);
                            setAtivo(0);
                        }}
                        onKeyDown={aoTeclar}
                        placeholder="Busque um jogo ou digite um comando…"
                        aria-label="Buscar"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="paleta-lista"
                    />
                    <kbd>Esc</kbd>
                </div>
                <div className="paleta-lista" id="paleta-lista" role="listbox" ref={listaRef}>
                    {itens.length === 0 && <p className="paleta-vazia">Nada encontrado para “{consulta}”.</p>}
                    {jogosEncontrados.length > 0 && <span className="paleta-grupo">{termo ? "Jogos" : "Mais bem avaliados"}</span>}
                    {itens.filter((i) => i.tipo === "jogo").map((item, posicao) => renderizarItem(item, posicao))}
                    {comandosEncontrados.length > 0 && <span className="paleta-grupo">Ir para / ações</span>}
                    {itens.filter((i) => i.tipo === "comando").map((item, posicao) => renderizarItem(item, jogosEncontrados.length + posicao))}
                </div>
                <div className="paleta-rodape">
                    <span>
                        <kbd>↑</kbd>
                        <kbd>↓</kbd> navegar
                    </span>
                    <span>
                        <kbd>Enter</kbd> abrir
                    </span>
                    <span>
                        <kbd>/</kbd> abre de qualquer lugar
                    </span>
                </div>
            </div>
        </div>
    );
}

export default PaletaComandos;
