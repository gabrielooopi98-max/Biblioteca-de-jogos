import { navegar } from "../hooks.js";
import CardJogo from "./CardJogo.jsx";
import { IconeBusca, IconeBussola, IconeCasa } from "./Icones.jsx";

const TEXTOS = {
    pagina: {
        titulo: "Página não encontrada",
        texto: "O endereço pode ter mudado ou nunca ter existido. Mas a sua próxima partida pode estar logo aqui.",
    },
    produto: {
        titulo: "Esse produto não está na loja",
        texto: "Ele pode ter esgotado ou o link está incompleto. Veja os acessórios disponíveis ou busque pelo nome.",
    },
    jogo: {
        titulo: "Esse jogo não está no catálogo",
        texto: "Ele pode ter saído da loja ou o link está incompleto. Busque pelo nome ou veja o que está em alta.",
    },
};

// Página 404: mantém a identidade da loja e sempre oferece um caminho para continuar.
function NaoEncontrada({ tipo = "pagina", sugestoes = [], abrirPaleta }) {
    const { titulo, texto } = TEXTOS[tipo] || TEXTOS.pagina;

    return (
        <div className="pagina nao-encontrada">
            <section className="nf-topo" aria-labelledby="nf-titulo">
                <p className="nf-codigo" aria-hidden="true">
                    404
                </p>
                <span className="rotulo">Erro 404</span>
                <h1 id="nf-titulo">{titulo}</h1>
                <p className="nf-texto">{texto}</p>
                <div className="nf-acoes">
                    <button type="button" className="botao botao-primario botao-grande" onClick={() => navegar("/")}>
                        <IconeCasa tamanho={17} /> Voltar para a loja
                    </button>
                    <button type="button" className="botao botao-secundario botao-grande" onClick={() => navegar("/explorar")}>
                        <IconeBussola tamanho={17} /> Explorar catálogo
                    </button>
                    <button type="button" className="botao botao-fantasma botao-grande" onClick={abrirPaleta}>
                        <IconeBusca tamanho={17} /> Buscar <kbd>Ctrl K</kbd>
                    </button>
                </div>
            </section>

            {sugestoes.length > 0 && (
                <section className="secao nf-sugestoes" aria-labelledby="nf-sugestoes">
                    <h2 className="titulo-secao" id="nf-sugestoes">
                        Em alta agora
                    </h2>
                    <div className="grade">
                        {sugestoes.map((jogo) => (
                            <CardJogo key={jogo.id} jogo={jogo} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

export default NaoEncontrada;
