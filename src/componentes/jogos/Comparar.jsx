// Página Comparar: tabela lado a lado com preço, nota, plataformas e gêneros dos jogos escolhidos.
import { navegar } from "../../utilidades/hooks.js";
import { useLoja } from "../../utilidades/LojaContext.js";
import { calcularPrecoFinal, formatarPreco, imagensDoJogo, LIMITE_COMPARAR } from "../../utilidades/funcoes.js";
import { Avaliacao, Imagem } from "../comum/CardJogo.jsx";
import { IconeCarrinho, IconeCheck, IconeComparar, IconeFechar, IconeMais } from "../comum/Icones.jsx";

// consoles vendidos pela loja; a tabela mostra só os que algum dos jogos comparados tem
const CONSOLES = ["PS5", "PS4", "PS3", "PS2", "Xbox Series X/S", "Xbox 360"];

function melhorId(jogos, valor, maior = true) {
    if (jogos.length < 2) return null;
    const ordenados = [...jogos].sort((a, b) => (maior ? valor(b) - valor(a) : valor(a) - valor(b)));
    return valor(ordenados[0]) === valor(ordenados[1]) ? null : ordenados[0].id;
}

function Comparar({ jogos }) {
    const { abrirJogo, adicionarAoCarrinho, alternarComparar, estaNoCarrinho } = useLoja();

    if (jogos.length === 0) {
        return (
            <div className="pagina">
                <div className="pagina-cabecalho">
                    <div>
                        <h1>Comparar</h1>
                        <p>Compare até {LIMITE_COMPARAR} jogos lado a lado.</p>
                    </div>
                </div>
                <div className="vazio">
                    <IconeComparar tamanho={30} />
                    <h3>Nenhum jogo selecionado</h3>
                    <p>Use o botão de comparar nos cards ou na página de um jogo.</p>
                    <button type="button" className="botao botao-primario" onClick={() => navegar("/explorar")}>
                        Escolher jogos
                    </button>
                </div>
            </div>
        );
    }

    const melhorPreco = melhorId(jogos, calcularPrecoFinal, false);
    const melhorNota = melhorId(jogos, (j) => j.nota);
    const maiorDesconto = melhorId(jogos, (j) => j.desconto);
    const destaque = (id, alvo) => (id === alvo ? " melhor" : "");

    const linhas = [
        ["Preço", (j) => <span className={`mono${destaque(j.id, melhorPreco)}`}>{formatarPreco(calcularPrecoFinal(j))}</span>],
        ["Desconto", (j) => <span className={`mono${destaque(j.id, maiorDesconto)}`}>{j.desconto ? `-${j.desconto}%` : "Sem desconto"}</span>],
        ["Nota", (j) => <span className={destaque(j.id, melhorNota).trim()}><Avaliacao nota={j.nota} /></span>],
        ["Lançamento", (j) => j.lancamento],
        ["Desenvolvedora", (j) => j.desenvolvedora],
        ["Gêneros", (j) => j.generos.join(", ")],
        ...CONSOLES.filter((p) => jogos.some((j) => j.plataformas.includes(p))).map((p) => [p, (j) => (j.plataformas.includes(p) ? <IconeCheck tamanho={16} className="sim" /> : <span className="nao">Não</span>)]),
    ];

    return (
        <div className="pagina">
            <div className="pagina-cabecalho">
                <div>
                    <h1>Comparar</h1>
                    <p>O melhor valor de cada critério aparece destacado.</p>
                </div>
            </div>
            <div className="comparacao-rolagem">
                <table className="comparacao" style={{ "--colunas": jogos.length }}>
                    <thead>
                        <tr>
                            <th scope="col" className="comparacao-rotulo" />
                            {jogos.map((jogo) => (
                                <th key={jogo.id} scope="col">
                                    <div className="comparacao-jogo">
                                        <button type="button" className="comparacao-remover icone-botao" onClick={() => alternarComparar(jogo)} aria-label={`Remover ${jogo.nome}`}>
                                            <IconeFechar tamanho={14} />
                                        </button>
                                        <button type="button" onClick={() => abrirJogo(jogo.id)} className="comparacao-imagem">
                                            <Imagem src={imagensDoJogo(jogo).horizontal} alt="" />
                                        </button>
                                        <button type="button" onClick={() => abrirJogo(jogo.id)} className="comparacao-nome">
                                            {jogo.nome}
                                        </button>
                                        <button type="button" className={estaNoCarrinho(jogo.id) ? "botao botao-secundario ativo" : "botao botao-primario"} onClick={() => adicionarAoCarrinho(jogo)}>
                                            {estaNoCarrinho(jogo.id) ? <IconeCheck tamanho={15} /> : <IconeCarrinho tamanho={15} />}
                                            {estaNoCarrinho(jogo.id) ? "No carrinho" : "Adicionar"}
                                        </button>
                                    </div>
                                </th>
                            ))}
                            {jogos.length < LIMITE_COMPARAR && (
                                <th scope="col">
                                    <button type="button" className="comparacao-adicionar" onClick={() => navegar("/explorar")}>
                                        <IconeMais tamanho={20} />
                                        Adicionar jogo
                                    </button>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {linhas.map(([rotulo, valor]) => (
                            <tr key={rotulo}>
                                <th scope="row" className="comparacao-rotulo">
                                    {rotulo}
                                </th>
                                {jogos.map((jogo) => (
                                    <td key={jogo.id}>{valor(jogo)}</td>
                                ))}
                                {jogos.length < LIMITE_COMPARAR && <td />}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Comparar;
