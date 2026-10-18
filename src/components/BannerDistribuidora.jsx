import { useLoja } from "../LojaContext.js";
import { imagensDoJogo } from "../utils.js";
import { Imagem, Preco } from "./CardJogo.jsx";

// Banner de largura total no estilo "Promoção da distribuidora": arte recortada na diagonal + três capas inclinadas.
function BannerDistribuidora({ distribuidora, subtitulo, personagem, jogos, aoVerTodos }) {
    const { abrirJogo } = useLoja();
    const descontoMaximo = Math.max(...jogos.map((j) => j.desconto));
    const imagensPersonagem = imagensDoJogo(personagem);

    return (
        <section className="distribuidora" aria-label={`Promoção da distribuidora ${distribuidora}`}>
            <img className="distribuidora-ambiente" src={imagensPersonagem.banner} alt="" />

            <button type="button" className="distribuidora-personagem" onClick={aoVerTodos} aria-label={`Ver todos os jogos da ${distribuidora} em promoção`}>
                <span className="distribuidora-recorte">
                    <Imagem src={imagensPersonagem.capa} alternativa={imagensPersonagem.horizontal} alt="" loading="eager" />
                </span>
            </button>

            <div className="distribuidora-conteudo">
                <button type="button" className="distribuidora-titulo" onClick={aoVerTodos}>
                    <span className="distribuidora-chamada">Promoção da distribuidora</span>
                    <span className="distribuidora-divisor" aria-hidden="true" />
                    <span className="distribuidora-marca">
                        {distribuidora}
                        <small>{subtitulo}</small>
                    </span>
                </button>

                <div className="distribuidora-jogos">
                    {jogos.slice(0, 3).map((jogo) => (
                        <button key={jogo.id} type="button" className="distribuidora-jogo" onClick={() => abrirJogo(jogo.id)} aria-label={`${jogo.nome}, ${jogo.desconto}% de desconto`}>
                            <span className="distribuidora-capa">
                                <Imagem src={imagensDoJogo(jogo).destaque} alternativa={imagensDoJogo(jogo).horizontal} alt="" loading="eager" />
                            </span>
                            <span className="distribuidora-info">
                                <Preco jogo={jogo} />
                            </span>
                        </button>
                    ))}
                </div>

                <button type="button" className="distribuidora-ver" onClick={aoVerTodos}>
                    Até {descontoMaximo}% off em {jogos.length} jogos · ver todos
                </button>
            </div>
        </section>
    );
}

export default BannerDistribuidora;
