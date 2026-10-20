// Peças visuais compartilhadas pelo painel: contexto, avisos, modais, campos, estados vazios e de carregamento.
import { useEffect, useId, useRef, useState } from "react";
import { IconeAlerta, IconeCheck, IconeFechar } from "../../componentes/comum/Icones.jsx";

// --- Avisos (toasts) ---
export function Avisos({ avisos, remover }) {
    return (
        <div className="a-avisos" role="status" aria-live="polite">
            {avisos.map((a) => (
                <div key={a.id} className={`a-aviso ${a.tom}`}>
                    {a.tom === "erro" ? <IconeAlerta tamanho={16} /> : <IconeCheck tamanho={16} />}
                    <span>{a.texto}</span>
                    <button type="button" onClick={() => remover(a.id)} aria-label="Fechar aviso">
                        <IconeFechar tamanho={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}

// --- Modal com Esc, foco inicial e clique fora ---
export function Modal({ titulo, fechar, children, rodape, largo = false }) {
    const ref = useRef(null);
    useEffect(() => {
        const anterior = document.activeElement;
        ref.current?.querySelector("input, select, textarea, button:not(.a-modal-fechar)")?.focus();
        const tecla = (e) => e.key === "Escape" && fechar();
        document.addEventListener("keydown", tecla);
        return () => {
            document.removeEventListener("keydown", tecla);
            anterior?.focus?.();
        };
    }, [fechar]);
    return (
        <div className="a-modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && fechar()}>
            <div className={largo ? "a-modal largo" : "a-modal"} role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
                <header className="a-modal-topo">
                    <h2>{titulo}</h2>
                    <button type="button" className="a-icone-botao a-modal-fechar" onClick={fechar} aria-label="Fechar">
                        <IconeFechar tamanho={18} />
                    </button>
                </header>
                <div className="a-modal-corpo">{children}</div>
                {rodape && <footer className="a-modal-rodape">{rodape}</footer>}
            </div>
        </div>
    );
}

export function Confirmacao({ titulo, texto, rotulo = "Confirmar", perigo = false, ocupado = false, aoConfirmar, aoCancelar, children }) {
    return (
        <Modal
            titulo={titulo}
            fechar={ocupado ? () => {} : aoCancelar}
            rodape={
                <>
                    <button type="button" className="a-botao" onClick={aoCancelar} disabled={ocupado}>
                        Voltar
                    </button>
                    <button type="button" className={perigo ? "a-botao perigo" : "a-botao primario"} onClick={aoConfirmar} disabled={ocupado}>
                        {ocupado ? "Aguarde…" : rotulo}
                    </button>
                </>
            }
        >
            {texto && <p className="a-texto">{texto}</p>}
            {children}
        </Modal>
    );
}

// --- Campos ---
export function Campo({ rotulo, erro, dica, children, largura }) {
    const id = useId();
    const filho = typeof children === "function" ? children(id) : children;
    return (
        <div className={`a-campo ${largura ? `a-col-${largura}` : ""} ${erro ? "com-erro" : ""}`}>
            <label htmlFor={id}>{rotulo}</label>
            {filho}
            {erro ? (
                <span className="a-erro" role="alert">
                    {erro}
                </span>
            ) : (
                dica && <span className="a-dica">{dica}</span>
            )}
        </div>
    );
}

export function Interruptor({ marcado, aoMudar, rotulo, descricao, desativado }) {
    return (
        <label className={desativado ? "a-interruptor desativado" : "a-interruptor"}>
            <input type="checkbox" role="switch" checked={marcado} onChange={(e) => aoMudar(e.target.checked)} disabled={desativado} />
            <span className="a-interruptor-trilho" aria-hidden="true" />
            <span>
                <strong>{rotulo}</strong>
                {descricao && <small>{descricao}</small>}
            </span>
        </label>
    );
}

// Lista de etiquetas (plataformas, gêneros, compatibilidade…): Enter ou vírgula adiciona.
export function Etiquetas({ id, valores, aoMudar, sugestoes = [], placeholder }) {
    const [texto, setTexto] = useState("");
    const listaId = useId();
    function adicionar(valor) {
        const limpo = valor.trim();
        if (limpo && !valores.some((v) => v.toLowerCase() === limpo.toLowerCase())) aoMudar([...valores, limpo]);
        setTexto("");
    }
    return (
        <div className="a-etiquetas">
            {valores.map((v) => (
                <span key={v} className="a-etiqueta">
                    {v}
                    <button type="button" onClick={() => aoMudar(valores.filter((x) => x !== v))} aria-label={`Remover ${v}`}>
                        <IconeFechar tamanho={12} />
                    </button>
                </span>
            ))}
            <input
                id={id}
                className="a-etiquetas-entrada"
                value={texto}
                list={sugestoes.length ? listaId : undefined}
                placeholder={valores.length ? "" : placeholder}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        adicionar(texto);
                    } else if (e.key === "Backspace" && !texto && valores.length) {
                        aoMudar(valores.slice(0, -1));
                    }
                }}
                onBlur={() => texto && adicionar(texto)}
            />
            {sugestoes.length > 0 && (
                <datalist id={listaId}>
                    {sugestoes.map((s) => (
                        <option key={s} value={s} />
                    ))}
                </datalist>
            )}
        </div>
    );
}

// --- Estados ---
export function Selo({ tom = "neutro", children }) {
    return <span className={`a-selo ${tom}`}>{children}</span>;
}

export function Vazio({ icone: Icone, titulo, texto, acao }) {
    return (
        <div className="a-vazio">
            {Icone && <Icone tamanho={28} />}
            <h3>{titulo}</h3>
            {texto && <p>{texto}</p>}
            {acao}
        </div>
    );
}

export function Carregando({ linhas = 5, texto = "Carregando…" }) {
    return (
        <div className="a-carregando" aria-busy="true" aria-label={texto}>
            {Array.from({ length: linhas }, (_, i) => (
                <span key={i} className="a-esqueleto" style={{ width: `${90 - (i % 3) * 15}%` }} />
            ))}
        </div>
    );
}

export function ErroCarregar({ mensagem, tentarDeNovo }) {
    return (
        <div className="a-vazio erro" role="alert">
            <IconeAlerta tamanho={28} />
            <h3>Não foi possível carregar</h3>
            <p>{mensagem}</p>
            <button type="button" className="a-botao" onClick={tentarDeNovo}>
                Tentar de novo
            </button>
        </div>
    );
}

export function Paginacao({ pagina, total, porPagina, aoMudar }) {
    const paginas = Math.max(1, Math.ceil(total / porPagina));
    if (paginas <= 1) return null;
    return (
        <nav className="a-paginacao" aria-label="Paginação">
            <button type="button" className="a-botao" onClick={() => aoMudar(pagina - 1)} disabled={pagina === 0}>
                Anterior
            </button>
            <span>
                Página {pagina + 1} de {paginas}
            </span>
            <button type="button" className="a-botao" onClick={() => aoMudar(pagina + 1)} disabled={pagina >= paginas - 1}>
                Próxima
            </button>
        </nav>
    );
}

// Cabeçalho de cada seção
export function Cabecalho({ titulo, descricao, children }) {
    return (
        <header className="a-cabecalho">
            <div>
                <h1>{titulo}</h1>
                {descricao && <p>{descricao}</p>}
            </div>
            {children && <div className="a-cabecalho-acoes">{children}</div>}
        </header>
    );
}
