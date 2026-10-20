// Na primeira visita (sem conta), um convite discreto para entrar ou criar conta. Aparece uma vez só.
import { useEffect, useState } from "react";
import { navegar } from "../../utilidades/hooks.js";
import { IconeFechar, IconeRecibo, LogoMarca } from "../comum/Icones.jsx";

const CHAVE = "ug:convite-conta";

function jaViu() {
    try {
        return localStorage.getItem(CHAVE) === "1";
    } catch {
        return true;
    }
}

function marcarVisto() {
    try {
        localStorage.setItem(CHAVE, "1");
    } catch {
        /* sem armazenamento: o convite pode voltar, sem problema */
    }
}

export default function ConviteConta({ mostrar }) {
    const [visivel, setVisivel] = useState(false);
    const [saindo, setSaindo] = useState(false);

    useEffect(() => {
        if (!mostrar || jaViu()) return setVisivel(false);
        const t = setTimeout(() => setVisivel(true), 6000);
        return () => clearTimeout(t);
    }, [mostrar]);

    if (!visivel) return null;

    function fechar(depois) {
        marcarVisto();
        setSaindo(true);
        setTimeout(() => {
            setVisivel(false);
            depois?.();
        }, 220);
    }

    return (
        <aside className={saindo ? "convite-conta saindo" : "convite-conta"} role="dialog" aria-labelledby="convite-titulo">
            <button type="button" className="convite-fechar" onClick={() => fechar()} aria-label="Fechar convite">
                <IconeFechar tamanho={16} />
            </button>
            <div className="convite-topo">
                <LogoMarca tamanho={38} />
                <div>
                    <strong id="convite-titulo">Primeira vez na Universal Games?</strong>
                    <span>Crie sua conta grátis e acompanhe suas reservas de qualquer aparelho.</span>
                </div>
            </div>
            <p className="convite-beneficio">
                <IconeRecibo tamanho={15} /> Código de retirada sempre à mão, no celular ou no PC.
            </p>
            <div className="convite-botoes">
                <button type="button" className="botao botao-cheio botao-largo" onClick={() => fechar(() => navegar("/conta"))}>
                    Criar conta ou entrar
                </button>
                <button type="button" className="botao botao-fantasma" onClick={() => fechar()}>
                    Agora não
                </button>
            </div>
        </aside>
    );
}
