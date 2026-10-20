// Hooks próprios: armazenamento no navegador, rotas por hash (#/jogo/5), atalhos de teclado, efeitos e conta do cliente.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// useState que persiste no localStorage (falha silenciosamente em modo privado).
export function useArmazenamento(chave, valorInicial) {
    const [valor, setValor] = useState(() => {
        try {
            const salvo = localStorage.getItem(chave);
            return salvo !== null ? JSON.parse(salvo) : valorInicial;
        } catch {
            return valorInicial;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(chave, JSON.stringify(valor));
        } catch {
            // armazenamento indisponível
        }
    }, [chave, valor]);

    return [valor, setValor];
}

// Mantém o componente montado durante a animação de saída.
export function usePresenca(aberto, duracao = 280) {
    const [montado, setMontado] = useState(aberto);

    useEffect(() => {
        if (aberto) {
            setMontado(true);
            return;
        }
        const tempo = setTimeout(() => setMontado(false), duracao);
        return () => clearTimeout(tempo);
    }, [aberto, duracao]);

    return { montado: aberto || montado, saindo: !aberto && montado };
}

export function useTeclaEsc(ativo, aoPressionar) {
    useEffect(() => {
        if (!ativo) return;
        function lidar(evento) {
            if (evento.key === "Escape") aoPressionar();
        }
        window.addEventListener("keydown", lidar);
        return () => window.removeEventListener("keydown", lidar);
    }, [ativo, aoPressionar]);
}

export function useTravarRolagem(ativo) {
    useEffect(() => {
        if (!ativo) return;
        document.documentElement.classList.add("rolagem-travada");
        return () => document.documentElement.classList.remove("rolagem-travada");
    }, [ativo]);
}

function assinarHash(callback) {
    window.addEventListener("hashchange", callback);
    return () => window.removeEventListener("hashchange", callback);
}

export function useHash() {
    return useSyncExternalStore(assinarHash, () => window.location.hash);
}

export const PAGINAS = ["loja", "explorar", "acessorios", "reservas", "desejos", "comparar", "conta"];
// endereços antigos (de antes da retirada na loja) levam às reservas
const ALIASES = { biblioteca: "reservas", pedidos: "reservas", produtos: "acessorios", jogos: "explorar", entrar: "conta", login: "conta", cadastro: "conta" };

// Rotas por hash: #/explorar, #/jogo/25… (funciona no GitHub Pages sem configuração de servidor).
// Endereço que não corresponde a nenhuma página vira "404" (antes caía na loja sem avisar).
export function useRota() {
    const hash = useHash();
    if (!hash || hash === "#" || hash === "#/") return { pagina: "loja" };
    // link vencido do e-mail (#error=...): a página da conta explica e oferece um novo
    if (hash.startsWith("#error")) return { pagina: "conta" };
    // painel administrativo: #/admin, #/admin/produtos, #/admin/produtos/12…
    if (hash === "#/admin" || hash.startsWith("#/admin/")) {
        const [, , secao, parametro] = hash.slice(1).split("/");
        return { pagina: "admin", secao: secao || "painel", parametro };
    }
    const [, pagina, parametro] = hash.match(/^#\/([a-z]+)(?:\/(\d+))?\/?$/) || [];
    if ((pagina === "jogo" || pagina === "produto") && parametro) return { pagina, id: Number(parametro) };
    if (ALIASES[pagina] && !parametro) return { pagina: ALIASES[pagina] };
    if (PAGINAS.includes(pagina) && !parametro) return { pagina };
    return { pagina: "404" };
}

export function navegar(caminho) {
    if (window.location.hash !== `#${caminho}`) window.location.hash = caminho;
}

// Elementos com "luz que segue o cursor" e com paralaxe (lidos pelo CSS via --mx/--my e --px/--py).
const SELETOR_LUZ =
    ".cartao-imagem, .oferta, .categoria, .chamada, .desejo, .pedido, .compra, .garantia, .abas-lista, .resultados, .previa, .estatisticas, .slide-info, .metodo, .evento, .franquia, .comparacao-rolagem";
const SELETOR_PARALAXE = ".slide-midia, .galeria-palco";
// Botões de contorno: o preenchimento nasce de onde o cursor está (--bx/--by).
const SELETOR_BOTAO = ".botao-primario, .botao-secundario, .botao-vidro, .carrinho-botao";

// Um único listener para a página inteira, limitado a um cálculo por quadro.
export function useEfeitosPonteiro() {
    useEffect(() => {
        if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
        let quadro = 0;
        let evento = null;

        function aplicar() {
            quadro = 0;
            const alvo = evento.target;
            if (!(alvo instanceof Element)) return;

            const luz = alvo.closest(SELETOR_LUZ);
            if (luz) {
                const r = luz.getBoundingClientRect();
                luz.style.setProperty("--mx", `${evento.clientX - r.left}px`);
                luz.style.setProperty("--my", `${evento.clientY - r.top}px`);
                // cards: inclinação 3D leve (-0.5…0.5 em cada eixo)
                if (luz.classList.contains("cartao-imagem")) {
                    luz.style.setProperty("--tx", ((evento.clientX - r.left) / r.width - 0.5).toFixed(3));
                    luz.style.setProperty("--ty", ((evento.clientY - r.top) / r.height - 0.5).toFixed(3));
                }
            }

            const botao = alvo.closest(SELETOR_BOTAO);
            if (botao) {
                const r = botao.getBoundingClientRect();
                botao.style.setProperty("--bx", `${evento.clientX - r.left}px`);
                botao.style.setProperty("--by", `${evento.clientY - r.top}px`);
            }

            const paralaxe = alvo.closest(SELETOR_PARALAXE);
            if (paralaxe) {
                const r = paralaxe.getBoundingClientRect();
                paralaxe.style.setProperty("--px", ((evento.clientX - r.left) / r.width - 0.5).toFixed(3));
                paralaxe.style.setProperty("--py", ((evento.clientY - r.top) / r.height - 0.5).toFixed(3));
            }
        }

        function mover(e) {
            evento = e;
            if (!quadro) quadro = requestAnimationFrame(aplicar);
        }

        document.addEventListener("pointermove", mover, { passive: true });
        return () => {
            document.removeEventListener("pointermove", mover);
            cancelAnimationFrame(quadro);
        };
    }, []);
}

// Fundo que desliza até o item sob o mouse (menus e abas).
export function useIndicador() {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;
        if (!container) return;

        function mover(e) {
            const item = e.target instanceof Element ? e.target.closest("a, button") : null;
            if (!item || item === container || !container.contains(item)) return;
            const c = container.getBoundingClientRect();
            const a = item.getBoundingClientRect();
            const oculto = container.style.getPropertyValue("--ind-o") !== "1";
            // Na primeira entrada aparece direto no lugar; depois desliza entre os itens.
            if (oculto) container.dataset.instante = "";
            container.style.setProperty("--ind-x", `${a.left - c.left + container.scrollLeft}px`);
            container.style.setProperty("--ind-y", `${a.top - c.top}px`);
            container.style.setProperty("--ind-w", `${a.width}px`);
            container.style.setProperty("--ind-h", `${a.height}px`);
            container.style.setProperty("--ind-o", "1");
            if (oculto) requestAnimationFrame(() => delete container.dataset.instante);
        }

        function sair() {
            container.style.setProperty("--ind-o", "0");
        }

        container.addEventListener("pointerover", mover);
        container.addEventListener("pointerleave", sair);
        return () => {
            container.removeEventListener("pointerover", mover);
            container.removeEventListener("pointerleave", sair);
        };
    }, []);

    return ref;
}

export function useAtalho(combinacao, acao) {
    useEffect(() => {
        function lidar(evento) {
            if (combinacao(evento)) {
                evento.preventDefault();
                acao();
            }
        }
        window.addEventListener("keydown", lidar);
        return () => window.removeEventListener("keydown", lidar);
    }, [combinacao, acao]);
}

export function useContagemRegressiva(alvo) {
    const [agora, setAgora] = useState(() => Date.now());

    useEffect(() => {
        const intervalo = setInterval(() => setAgora(Date.now()), 1000);
        return () => clearInterval(intervalo);
    }, []);

    const restante = Math.max(0, alvo.getTime() - agora);
    return {
        dias: Math.floor(restante / 86400000),
        horas: Math.floor(restante / 3600000) % 24,
        minutos: Math.floor(restante / 60000) % 60,
        segundos: Math.floor(restante / 1000) % 60,
    };
}

// Mostra a prévia do trailer depois de um tempo com o mouse em cima (não dispara ao só passar).
export function usePreviaTrailer(atraso = 650) {
    const [ativa, setAtiva] = useState(false);
    const tempo = useRef(0);

    useEffect(() => () => clearTimeout(tempo.current), []);

    const eventos = {
        onPointerEnter: (e) => {
            if (e.pointerType !== "mouse") return;
            clearTimeout(tempo.current);
            tempo.current = setTimeout(() => setAtiva(true), atraso);
        },
        onPointerLeave: () => {
            clearTimeout(tempo.current);
            setAtiva(false);
        },
    };

    return [ativa, eventos];
}

// --- Conta do cliente ---
// Lê uma vez os parâmetros que o Supabase põe no endereço ao voltar de um e-mail
// (?code=... da confirmação ou da troca de senha, ?redefinir=1, ou #error=... de link vencido).
function retornoDoEmail() {
    const busca = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith("#error") ? new URLSearchParams(window.location.hash.slice(1)) : null;
    const erro = busca.get("error_description") || hash?.get("error_description");
    return { codigo: busca.has("code"), redefinir: busca.get("redefinir") === "1", erro: erro ? "O link expirou ou já foi usado. Peça um novo abaixo." : "" };
}

// tira ?code=... do endereço e abre a página da conta (sem recarregar)
function limparEndereco(irParaConta) {
    window.history.replaceState(null, "", `${window.location.pathname}${irParaConta ? "#/conta" : window.location.hash}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function useConta() {
    const [estado, setEstado] = useState({ pronta: false, usuario: null, redefinir: false, aviso: "" });

    useEffect(() => {
        if (!import.meta.env.VITE_SUPABASE_URL) {
            setEstado((e) => ({ ...e, pronta: true }));
            return;
        }
        const retorno = retornoDoEmail();
        const veioDeLink = retorno.codigo || retorno.redefinir || Boolean(retorno.erro);
        let ativo = true;
        let assinatura;
        let primeira = true;
        import("../servicos/conta.js")
            .then((conta) => {
                if (!ativo) return;
                if (!conta.clientes) return setEstado((e) => ({ ...e, pronta: true }));
                assinatura = conta.aoMudar((evento, sessao) => {
                    if (!ativo) return;
                    const usuario = sessao?.user ?? null;
                    setEstado((e) => {
                        let { redefinir, aviso } = e;
                        if (primeira && veioDeLink) {
                            redefinir = retorno.redefinir && Boolean(usuario);
                            aviso = retorno.erro || (retorno.redefinir ? (usuario ? "" : "O link de troca de senha expirou ou foi aberto em outro navegador. Peça um novo.") : usuario ? "E-mail confirmado. Sua conta está pronta!" : "E-mail confirmado! Agora é só entrar com sua senha.");
                        }
                        if (evento === "PASSWORD_RECOVERY") redefinir = true;
                        if (evento === "SIGNED_OUT") redefinir = false;
                        return { pronta: true, usuario, redefinir, aviso };
                    });
                    if (primeira && veioDeLink) limparEndereco(true);
                    primeira = false;
                });
            })
            .catch(() => ativo && setEstado((e) => ({ ...e, pronta: true })));
        return () => {
            ativo = false;
            assinatura?.unsubscribe();
        };
    }, []);

    return [estado, setEstado];
}
