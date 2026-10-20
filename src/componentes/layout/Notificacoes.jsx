// Avisos rápidos no canto da tela (ex.: "adicionado ao carrinho"), com ação opcional.
import { IconeCheck, IconeCoracao, IconeFechar } from "../comum/Icones.jsx";

const ICONES = {
    sucesso: IconeCheck,
    desejo: IconeCoracao,
};

function Notificacoes({ itens, remover }) {
    return (
        <div className="notificacoes" role="status" aria-live="polite">
            {itens.map(({ id, mensagem, tipo = "sucesso", imagem, acao, saindo }) => {
                const Icone = ICONES[tipo] || IconeCheck;
                return (
                    <div key={id} className={`notificacao notificacao-${tipo}${saindo ? " saindo" : ""}`}>
                        {imagem ? (
                            <img src={imagem} alt="" />
                        ) : (
                            <span className="notificacao-icone">
                                <Icone tamanho={16} />
                            </span>
                        )}
                        <p>{mensagem}</p>
                        {acao && (
                            <button
                                type="button"
                                className="notificacao-acao"
                                onClick={() => {
                                    acao.aoClicar();
                                    remover(id);
                                }}
                            >
                                {acao.rotulo}
                            </button>
                        )}
                        <button type="button" className="notificacao-fechar" onClick={() => remover(id)} aria-label="Dispensar">
                            <IconeFechar tamanho={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

export default Notificacoes;
