import { navegar } from "../hooks.js";
import { useLoja } from "../LojaContext.js";
import { imagensDoJogo, LIMITE_COMPARAR } from "../utils.js";
import { IconeComparar, IconeFechar } from "./Icones.jsx";

// Bandeja flutuante com os jogos marcados para comparação (aparece em todas as páginas, exceto a própria comparação).
function BandejaComparar({ jogos, limpar, oculta }) {
    const { alternarComparar } = useLoja();
    if (jogos.length === 0 || oculta) return null;

    return (
        <div className="bandeja" role="region" aria-label="Jogos para comparar">
            <IconeComparar tamanho={16} className="bandeja-icone" />
            <div className="bandeja-jogos">
                {jogos.map((jogo) => (
                    <button key={jogo.id} type="button" className="bandeja-jogo" onClick={() => alternarComparar(jogo)} title={`Remover ${jogo.nome}`} aria-label={`Remover ${jogo.nome} da comparação`}>
                        <img src={imagensDoJogo(jogo).horizontal} alt="" />
                        <IconeFechar tamanho={12} />
                    </button>
                ))}
                {Array.from({ length: LIMITE_COMPARAR - jogos.length }, (_, i) => (
                    <span key={i} className="bandeja-vaga" />
                ))}
            </div>
            <button type="button" className="botao botao-primario" onClick={() => navegar("/comparar")} disabled={jogos.length < 2}>
                Comparar {jogos.length}/{LIMITE_COMPARAR}
            </button>
            <button type="button" className="icone-botao" onClick={limpar} aria-label="Limpar comparação">
                <IconeFechar tamanho={16} />
            </button>
        </div>
    );
}

export default BandejaComparar;
