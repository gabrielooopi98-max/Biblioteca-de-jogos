import { useState } from "react";
import { useTeclaEsc, useTravarRolagem } from "../hooks.js";
import { useLoja } from "../LojaContext.js";
import { calcularPrecoFinal, FILTROS_INICIAIS, formatarPreco, normalizar } from "../utils.js";
import CardJogo from "./CardJogo.jsx";
import { IconeControle, IconeFechar, IconeFiltro } from "./Icones.jsx";

const POR_PAGINA = 24;

const ORDENACOES = {
    relevancia: { rotulo: "Relevância", comparar: (a, b) => b.nota * 10 + b.desconto / 10 - (a.nota * 10 + a.desconto / 10) },
    "maior-desconto": { rotulo: "Maior desconto", comparar: (a, b) => b.desconto - a.desconto },
    "menor-preco": { rotulo: "Menor preço", comparar: (a, b) => calcularPrecoFinal(a) - calcularPrecoFinal(b) },
    "maior-preco": { rotulo: "Maior preço", comparar: (a, b) => calcularPrecoFinal(b) - calcularPrecoFinal(a) },
    "mais-recentes": { rotulo: "Mais recentes", comparar: (a, b) => b.lancamento - a.lancamento },
    "melhor-avaliados": { rotulo: "Melhor avaliados", comparar: (a, b) => b.nota - a.nota },
    alfabetica: { rotulo: "A a Z", comparar: (a, b) => a.nome.localeCompare(b.nome, "pt-BR") },
};

const NOTAS = [
    [0, "Qualquer nota"],
    [7.8, "7.8 ou mais"],
    [8.5, "8.5 ou mais"],
    [9.5, "9.5 ou mais"],
];

function filtrarJogos(jogos, filtros, possui) {
    const termo = normalizar(filtros.termo);

    return jogos
        .filter((jogo) => {
            if (termo && !normalizar(`${jogo.nome} ${jogo.desenvolvedora} ${jogo.generos.join(" ")}`).includes(termo)) return false;
            if (filtros.generos.length && !filtros.generos.every((g) => jogo.generos.includes(g))) return false;
            if (filtros.plataformas.length && !filtros.plataformas.some((p) => jogo.plataformas.includes(p))) return false;
            if (filtros.precoMax !== null && calcularPrecoFinal(jogo) > filtros.precoMax) return false;
            if (jogo.nota < filtros.notaMin) return false;
            if (filtros.somentePromocao && !jogo.desconto) return false;
            if (filtros.ocultarPossuidos && possui(jogo.id)) return false;
            if (filtros.colecao && !filtros.colecao.ids.includes(jogo.id)) return false;
            return true;
        })
        .sort(ORDENACOES[filtros.ordenar].comparar);
}

function contarPor(jogos, campo) {
    const contagem = new Map();
    for (const jogo of jogos) for (const valor of jogo[campo]) contagem.set(valor, (contagem.get(valor) || 0) + 1);
    return [...contagem.entries()].sort((a, b) => b[1] - a[1]);
}

function alternar(lista, valor) {
    return lista.includes(valor) ? lista.filter((item) => item !== valor) : [...lista, valor];
}

function Caixa({ marcado, aoMudar, rotulo, quantidade, tipo = "checkbox", nome }) {
    return (
        <label className="caixa">
            <input type={tipo} name={nome} checked={marcado} onChange={aoMudar} />
            <span className={tipo === "radio" ? "caixa-marca redonda" : "caixa-marca"} aria-hidden="true" />
            <span className="caixa-rotulo">{rotulo}</span>
            {quantidade !== undefined && <small>{quantidade}</small>}
        </label>
    );
}

function Catalogo({ jogos, filtros, setFiltros }) {
    const { possui } = useLoja();
    const [painelAberto, setPainelAberto] = useState(false);
    const [limite, setLimite] = useState(POR_PAGINA);
    const assinatura = JSON.stringify(filtros);
    const [assinaturaAnterior, setAssinaturaAnterior] = useState(assinatura);

    if (assinatura !== assinaturaAnterior) {
        setAssinaturaAnterior(assinatura);
        setLimite(POR_PAGINA);
    }

    useTravarRolagem(painelAberto);
    useTeclaEsc(painelAberto, () => setPainelAberto(false));

    const generos = contarPor(jogos, "generos");
    const plataformas = contarPor(jogos, "plataformas");
    const precoTeto = Math.ceil(Math.max(...jogos.map(calcularPrecoFinal)) / 10) * 10;
    const resultado = filtrarJogos(jogos, filtros, possui);

    const atualizar = (parcial) => setFiltros((atuais) => ({ ...atuais, ...parcial }));
    const limparTudo = () => setFiltros((atuais) => ({ ...FILTROS_INICIAIS, ordenar: atuais.ordenar }));

    const chips = [
        filtros.colecao && { rotulo: filtros.colecao.nome, remover: () => atualizar({ colecao: null }) },
        filtros.termo && { rotulo: `“${filtros.termo}”`, remover: () => atualizar({ termo: "" }) },
        ...filtros.generos.map((g) => ({ rotulo: g, remover: () => atualizar({ generos: filtros.generos.filter((x) => x !== g) }) })),
        ...filtros.plataformas.map((p) => ({ rotulo: p, remover: () => atualizar({ plataformas: filtros.plataformas.filter((x) => x !== p) }) })),
        filtros.precoMax !== null && { rotulo: `Até ${formatarPreco(filtros.precoMax)}`, remover: () => atualizar({ precoMax: null }) },
        filtros.notaMin > 0 && { rotulo: `Nota ${filtros.notaMin}+`, remover: () => atualizar({ notaMin: 0 }) },
        filtros.somentePromocao && { rotulo: "Em promoção", remover: () => atualizar({ somentePromocao: false }) },
        filtros.ocultarPossuidos && { rotulo: "Sem os que possuo", remover: () => atualizar({ ocultarPossuidos: false }) },
    ].filter(Boolean);

    return (
        <div className="pagina">
            <div className="pagina-cabecalho">
                <div>
                    <h1>Explorar</h1>
                    <p>
                        {jogos.length} jogos · {jogos.filter((j) => j.desconto > 0).length} em promoção
                    </p>
                </div>
            </div>

            <div className="catalogo">
                <aside className={painelAberto ? "filtros aberto" : "filtros"} aria-label="Filtros">
                    <div className="filtros-topo">
                        <h2>Filtros</h2>
                        <button type="button" className="icone-botao" onClick={() => setPainelAberto(false)} aria-label="Fechar filtros">
                            <IconeFechar tamanho={18} />
                        </button>
                    </div>

                    <div className="grupo-filtro">
                        <Caixa marcado={filtros.somentePromocao} aoMudar={(e) => atualizar({ somentePromocao: e.target.checked })} rotulo="Somente em promoção" />
                        <Caixa marcado={filtros.ocultarPossuidos} aoMudar={(e) => atualizar({ ocultarPossuidos: e.target.checked })} rotulo="Ocultar jogos que já possuo" />
                    </div>

                    <div className="grupo-filtro">
                        <h3>Preço máximo</h3>
                        <input
                            type="range"
                            className="faixa"
                            min={10}
                            max={precoTeto}
                            step={10}
                            value={filtros.precoMax ?? precoTeto}
                            onChange={(e) => {
                                const valor = Number(e.target.value);
                                atualizar({ precoMax: valor >= precoTeto ? null : valor });
                            }}
                            aria-label="Preço máximo"
                        />
                        <span className="faixa-valor">{filtros.precoMax === null ? "Qualquer preço" : `Até ${formatarPreco(filtros.precoMax)}`}</span>
                    </div>

                    <div className="grupo-filtro">
                        <h3>Nota</h3>
                        {NOTAS.map(([nota, rotulo]) => (
                            <Caixa key={nota} tipo="radio" nome="nota" marcado={filtros.notaMin === nota} aoMudar={() => atualizar({ notaMin: nota })} rotulo={rotulo} />
                        ))}
                    </div>

                    <div className="grupo-filtro">
                        <h3>Gênero</h3>
                        {generos.map(([genero, quantidade]) => (
                            <Caixa key={genero} marcado={filtros.generos.includes(genero)} aoMudar={() => atualizar({ generos: alternar(filtros.generos, genero) })} rotulo={genero} quantidade={quantidade} />
                        ))}
                    </div>

                    <div className="grupo-filtro">
                        <h3>Plataforma</h3>
                        {plataformas.map(([plataforma, quantidade]) => (
                            <Caixa
                                key={plataforma}
                                marcado={filtros.plataformas.includes(plataforma)}
                                aoMudar={() => atualizar({ plataformas: alternar(filtros.plataformas, plataforma) })}
                                rotulo={plataforma}
                                quantidade={quantidade}
                            />
                        ))}
                    </div>

                    <div className="filtros-rodape">
                        <button type="button" className="botao botao-secundario" onClick={limparTudo}>
                            Limpar
                        </button>
                        <button type="button" className="botao botao-primario" onClick={() => setPainelAberto(false)}>
                            Ver {resultado.length} jogos
                        </button>
                    </div>
                </aside>
                <div className={painelAberto ? "filtros-fundo ativo" : "filtros-fundo"} onClick={() => setPainelAberto(false)} aria-hidden="true" />

                <div className="catalogo-principal">
                    <div className="catalogo-barra">
                        <input
                            type="search"
                            className="campo campo-busca"
                            placeholder="Filtrar por nome, estúdio ou gênero"
                            value={filtros.termo}
                            onChange={(e) => atualizar({ termo: e.target.value })}
                            aria-label="Filtrar por nome"
                        />
                        <button type="button" className="botao botao-secundario botao-filtros" onClick={() => setPainelAberto(true)}>
                            <IconeFiltro tamanho={16} /> Filtros{chips.length > 0 && ` · ${chips.length}`}
                        </button>
                        <select className="campo seletor" value={filtros.ordenar} onChange={(e) => atualizar({ ordenar: e.target.value })} aria-label="Ordenar por">
                            {Object.entries(ORDENACOES).map(([valor, { rotulo }]) => (
                                <option key={valor} value={valor}>
                                    {rotulo}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="catalogo-resumo">
                        <span>
                            <strong>{resultado.length}</strong> {resultado.length === 1 ? "resultado" : "resultados"}
                        </span>
                        {chips.map((chip) => (
                            <button type="button" key={chip.rotulo} className="chip" onClick={chip.remover} title="Remover filtro">
                                {chip.rotulo}
                                <IconeFechar tamanho={12} />
                            </button>
                        ))}
                        {chips.length > 0 && (
                            <button type="button" className="link-mais" onClick={limparTudo}>
                                Limpar tudo
                            </button>
                        )}
                    </div>

                    {resultado.length > 0 ? (
                        <>
                            <div className="grade">
                                {resultado.slice(0, limite).map((jogo) => (
                                    <CardJogo key={jogo.id} jogo={jogo} />
                                ))}
                            </div>
                            {limite < resultado.length && (
                                <button type="button" className="botao botao-secundario botao-largo carregar-mais" onClick={() => setLimite((l) => l + POR_PAGINA)}>
                                    Mostrar mais {Math.min(POR_PAGINA, resultado.length - limite)} de {resultado.length - limite}
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="vazio">
                            <IconeControle tamanho={30} />
                            <h3>Nenhum jogo encontrado</h3>
                            <p>Ajuste os filtros ou busque por outro termo.</p>
                            <button type="button" className="botao botao-secundario" onClick={limparTudo}>
                                Limpar filtros
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Catalogo;
