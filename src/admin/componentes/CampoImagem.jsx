// Escolha de imagem com validação do arquivo, prévia lado a lado (atual × nova) e desfazer antes de salvar.
// Nada é enviado aqui: o envio acontece só quando o produto é salvo.
import { useId, useState } from "react";
import { SEM_IMAGEM } from "../../servicos/catalogo.js";
import { IconeEnviar, IconeFechar, IconeSetaDireita, IconeSetaEsquerda } from "../../componentes/comum/Icones.jsx";
import { validarImagem } from "../servicos/api.js";

const ACEITOS = "image/jpeg,image/png,image/webp";

// pendente = { arquivo, tipo, previa } guardado pelo formulário até salvar
async function prepararArquivo(arquivo) {
    const { tipo, erro } = await validarImagem(arquivo);
    if (erro) return { erro };
    return { pendente: { arquivo, tipo, previa: URL.createObjectURL(arquivo), id: `${Date.now()}-${Math.random()}` } };
}

export function CampoImagem({ rotulo, dica, atual, atualPadrao, pendente, aoEscolher, aoDesfazer, aoRemover, proporcao = "4 / 3" }) {
    const id = useId();
    const [erro, setErro] = useState("");
    const [lendo, setLendo] = useState(false);

    async function escolher(e) {
        const arquivo = e.target.files?.[0];
        e.target.value = "";
        if (!arquivo) return;
        setLendo(true);
        const { pendente: novo, erro: falha } = await prepararArquivo(arquivo);
        setLendo(false);
        setErro(falha || "");
        if (novo) aoEscolher(novo);
    }

    const mostrarAtual = atual || atualPadrao;
    return (
        <div className="a-imagem-campo">
            <span className="a-imagem-rotulo">{rotulo}</span>
            <div className="a-imagem-previas">
                <figure>
                    <div className="a-imagem-moldura" style={{ aspectRatio: proporcao }}>
                        <img src={mostrarAtual || SEM_IMAGEM} alt="" onError={(e) => (e.currentTarget.src = SEM_IMAGEM)} />
                    </div>
                    <figcaption>{atual ? "Atual" : atualPadrao ? "Atual (padrão da Steam)" : "Sem imagem"}</figcaption>
                </figure>
                {pendente && (
                    <>
                        <IconeSetaDireita tamanho={18} className="a-imagem-seta" />
                        <figure className="nova">
                            <div className="a-imagem-moldura" style={{ aspectRatio: proporcao }}>
                                <img src={pendente.previa} alt="Prévia da nova imagem" />
                            </div>
                            <figcaption>Nova (enviada ao salvar)</figcaption>
                        </figure>
                    </>
                )}
            </div>
            <div className="a-imagem-acoes">
                <label className="a-botao" htmlFor={id}>
                    <IconeEnviar tamanho={16} /> {lendo ? "Conferindo…" : pendente || atual ? "Trocar imagem" : "Escolher imagem"}
                </label>
                <input id={id} className="so-leitor" type="file" accept={ACEITOS} onChange={escolher} />
                {pendente && (
                    <button type="button" className="a-botao" onClick={aoDesfazer}>
                        Cancelar troca
                    </button>
                )}
                {!pendente && atual && aoRemover && (
                    <button type="button" className="a-botao" onClick={aoRemover}>
                        {atualPadrao ? "Voltar para a da Steam" : "Remover imagem"}
                    </button>
                )}
            </div>
            {erro ? (
                <span className="a-erro" role="alert">
                    {erro}
                </span>
            ) : (
                <span className="a-dica">{dica || "JPEG, PNG ou WebP de até 5 MB."}</span>
            )}
        </div>
    );
}

// Galeria: itens são { url } (já salvos) ou { pendente } (novos); dá para reordenar e remover.
export function CampoGaleria({ itens, aoMudar }) {
    const id = useId();
    const [erro, setErro] = useState("");

    async function adicionar(e) {
        const arquivos = [...(e.target.files || [])];
        e.target.value = "";
        const novos = [];
        const erros = [];
        for (const arquivo of arquivos) {
            const { pendente, erro: falha } = await prepararArquivo(arquivo);
            if (falha) erros.push(falha);
            else novos.push({ pendente });
        }
        setErro(erros.join(" "));
        if (novos.length) aoMudar([...itens, ...novos].slice(0, 12));
    }

    const mover = (i, passo) => {
        const lista = [...itens];
        [lista[i], lista[i + passo]] = [lista[i + passo], lista[i]];
        aoMudar(lista);
    };

    return (
        <div className="a-imagem-campo">
            <span className="a-imagem-rotulo">Galeria (opcional)</span>
            {itens.length > 0 && (
                <ol className="a-galeria">
                    {itens.map((item, i) => (
                        <li key={item.url || item.pendente.id} className={item.pendente ? "nova" : ""}>
                            <img src={item.url || item.pendente.previa} alt={`Imagem ${i + 1} da galeria`} onError={(e) => (e.currentTarget.src = SEM_IMAGEM)} />
                            <div className="a-galeria-acoes">
                                <button type="button" className="a-icone-botao" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Mover para a esquerda">
                                    <IconeSetaEsquerda tamanho={15} />
                                </button>
                                <button type="button" className="a-icone-botao" onClick={() => aoMudar(itens.filter((_, j) => j !== i))} aria-label="Remover da galeria">
                                    <IconeFechar tamanho={15} />
                                </button>
                                <button type="button" className="a-icone-botao" onClick={() => mover(i, 1)} disabled={i === itens.length - 1} aria-label="Mover para a direita">
                                    <IconeSetaDireita tamanho={15} />
                                </button>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
            <div className="a-imagem-acoes">
                <label className="a-botao" htmlFor={id}>
                    <IconeEnviar tamanho={16} /> Adicionar imagens
                </label>
                <input id={id} className="so-leitor" type="file" accept={ACEITOS} multiple onChange={adicionar} />
            </div>
            {erro ? (
                <span className="a-erro" role="alert">
                    {erro}
                </span>
            ) : (
                <span className="a-dica">Até 12 imagens. Nos jogos, a galeria substitui as capturas da Steam na página do jogo.</span>
            )}
        </div>
    );
}
