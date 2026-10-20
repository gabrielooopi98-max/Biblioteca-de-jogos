// Painel administrativo (#/admin): login, checagem de administrador no banco, menu lateral e seções.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { navegar, useArmazenamento } from "../utilidades/hooks.js";
import { esperaRestante, limparErros, registrarErro } from "../utilidades/senha.js";
import { supabase } from "../servicos/supabase.js";
import {
    IconeCadeado,
    IconeCaixa,
    IconeCarrinho,
    IconeControle,
    IconeEscudo,
    IconeEtiqueta,
    IconeExterno,
    IconeGrade,
    IconeLista,
    IconeLua,
    IconeMais,
    IconeMenu,
    IconeOlho,
    IconeOlhoFechado,
    IconeRecibo,
    IconeRelogio,
    IconeSair,
    IconeSol,
    LogoMarca,
} from "../componentes/comum/Icones.jsx";
import * as api from "./servicos/api.js";
import { Avisos, Campo, Carregando } from "./componentes/ui.jsx";
import { ContextoAdmin, useAvisos } from "./servicos/util.js";
import "./admin.css";

const Painel = lazy(() => import("./telas/Painel.jsx"));
const Produtos = lazy(() => import("./telas/Produtos.jsx"));
const ProdutoForm = lazy(() => import("./telas/ProdutoForm.jsx"));
const Promocoes = lazy(() => import("./telas/Promocoes.jsx"));
const Categorias = lazy(() => import("./telas/Categorias.jsx"));
const Estoque = lazy(() => import("./telas/Estoque.jsx"));
const Reservas = lazy(() => import("./telas/Reservas.jsx"));
const Historico = lazy(() => import("./telas/Historico.jsx"));
const Vendas = lazy(() => import("./telas/Vendas.jsx"));

const SECOES = [
    { id: "painel", rotulo: "Visão geral", Icone: IconeGrade, grupo: "Loja" },
    { id: "vendas", rotulo: "Vendas", Icone: IconeCarrinho, grupo: "Loja" },
    { id: "reservas", rotulo: "Reservas", Icone: IconeRecibo, grupo: "Loja" },
    { id: "produtos", rotulo: "Produtos", Icone: IconeControle, grupo: "Catálogo" },
    { id: "categorias", rotulo: "Categorias", Icone: IconeLista, grupo: "Catálogo" },
    { id: "promocoes", rotulo: "Preços e promoções", Icone: IconeEtiqueta, grupo: "Catálogo" },
    { id: "estoque", rotulo: "Estoque", Icone: IconeCaixa, grupo: "Catálogo" },
    { id: "historico", rotulo: "Histórico", Icone: IconeRelogio, grupo: "Sistema" },
];
const GRUPOS = [...new Set(SECOES.map((s) => s.grupo))];
const hojePorExtenso = () => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

// saída pelo botão "Sair" (para não avisar "sessão terminou" quando foi a própria pessoa)
let saidaManual = false;
const CHAVE_TENTATIVAS_PAINEL = "ug:tentativas-painel";
const sairDoPainel = () => {
    saidaManual = true;
    return api.sair();
};

export default function Admin(props) {
    const [tema, alternarTema] = useTemaPainel();
    return (
        <div className="admin" data-tema={tema}>
            {supabase ? <AdminComSessao {...props} tema={tema} alternarTema={alternarTema} /> : <SemServidor />}
        </div>
    );
}

// Sem as variáveis do Supabase o painel não funciona: explica o que falta em vez de fingir.
function SemServidor() {
    return (
        <main className="a-entrada">
            <div className="a-entrada-caixa">
                <LogoMarca tamanho={44} />
                <h1>Painel não configurado</h1>
                <p>
                    O painel precisa do servidor (Supabase). Crie o arquivo <code>.env.local</code> na pasta do projeto com <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>, rode a migração em{" "}
                    <code>supabase/migrations</code> e gere o site de novo. O passo a passo está em <code>supabase/LEIA-ME.md</code>.
                </p>
                <a className="a-botao" href="#/">
                    Voltar para a loja
                </a>
            </div>
        </main>
    );
}

function AdminComSessao({ secao = "painel", parametro, aoAlterarCatalogo, tema, alternarTema }) {
    const [sessao, setSessao] = useState(undefined); // undefined: conferindo
    const [admin, setAdmin] = useState(null); // null: conferindo
    const [aviso, setAviso] = useState("");
    const tinhaSessao = useRef(false);
    tinhaSessao.current = Boolean(sessao);

    useEffect(() => {
        let ativo = true;
        api.sessaoAtual()
            .then((s) => ativo && setSessao(s))
            .catch(() => ativo && setSessao(null));
        const assinatura = api.aoMudarSessao((evento, s) => {
            if (evento === "SIGNED_OUT") {
                if (tinhaSessao.current && !saidaManual) setAviso("Sua sessão terminou. Entre de novo para continuar.");
                saidaManual = false;
                setSessao(null);
                setAdmin(null);
            } else if (s) {
                setSessao(s);
            }
        });
        return () => {
            ativo = false;
            assinatura.unsubscribe();
        };
    }, []);

    // a permissão é conferida no banco (tabela administradores), não só aqui
    const idUsuario = sessao?.user?.id;
    useEffect(() => {
        if (!idUsuario) return;
        let ativo = true;
        api.ehAdmin()
            .then(async (eh) => {
                if (!ativo) return;
                if (!eh) {
                    await sairDoPainel();
                    setAviso("Esta conta não tem acesso ao painel administrativo.");
                }
                setAdmin(eh);
            })
            .catch((e) => {
                if (!ativo) return;
                setAviso(e.message);
                setAdmin(false);
            });
        return () => {
            ativo = false;
        };
    }, [idUsuario]);

    useEffect(() => {
        document.title = "Painel · Universal Games";
        document.querySelector('meta[name="robots"]')?.setAttribute("content", "noindex");
    }, []);

    if (sessao === undefined || (sessao && admin === null)) return <Carregando linhas={3} texto="Conferindo acesso" />;
    if (!sessao || !admin) return <Login aviso={aviso} limparAviso={() => setAviso("")} tema={tema} alternarTema={alternarTema} />;
    return <Layout secao={secao} parametro={parametro} usuario={sessao.user} aoAlterarCatalogo={aoAlterarCatalogo} tema={tema} alternarTema={alternarTema} />;
}

function Login({ aviso, limparAviso, tema, alternarTema }) {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [verSenha, setVerSenha] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const [erro, setErro] = useState("");
    const [entrando, setEntrando] = useState(false);
    const [espera, setEspera] = useState(() => esperaRestante(CHAVE_TENTATIVAS_PAINEL));

    useEffect(() => {
        if (!espera) return;
        const t = setInterval(() => setEspera(esperaRestante(CHAVE_TENTATIVAS_PAINEL)), 1000);
        return () => clearInterval(t);
    }, [espera]);

    async function enviar(e) {
        e.preventDefault();
        if (espera) return;
        setErro("");
        limparAviso();
        setEntrando(true);
        try {
            await api.entrar(email, senha);
            limparErros(CHAVE_TENTATIVAS_PAINEL);
        } catch (falha) {
            registrarErro(CHAVE_TENTATIVAS_PAINEL);
            setEspera(esperaRestante(CHAVE_TENTATIVAS_PAINEL));
            setErro(falha.message);
            setSenha("");
        } finally {
            setEntrando(false);
        }
    }

    const verCaps = (e) => setCapsLock(Boolean(e.getModifierState?.("CapsLock")));

    return (
        <main className="a-login">
            <section className="a-login-marca" aria-hidden="true">
                <div className="a-login-marca-topo">
                    <LogoMarca tamanho={42} />
                    <span>
                        Universal Games
                        <small>Painel da loja</small>
                    </span>
                </div>
                <div className="a-login-marca-meio">
                    <h2>
                        Toda a loja
                        <br />
                        em um só lugar.
                    </h2>
                    <ul>
                        <li>
                            <IconeGrade tamanho={18} /> Vendas e gráficos em tempo real
                        </li>
                        <li>
                            <IconeRecibo tamanho={18} /> Reservas e retirada no balcão
                        </li>
                        <li>
                            <IconeCaixa tamanho={18} /> Estoque, preços e promoções
                        </li>
                        <li>
                            <IconeCadeado tamanho={18} /> Acesso só para administradores
                        </li>
                    </ul>
                </div>
                <small className="a-login-marca-rodape">© {new Date().getFullYear()} Universal Games</small>
            </section>

            <section className="a-login-lado">
                <div className="a-login-acoes">
                    <a className="a-link" href="#/">
                        ← Voltar para a loja
                    </a>
                    <BotaoTema tema={tema} alternar={alternarTema} />
                </div>
                <form className="a-login-form" onSubmit={enviar}>
                    <span className="a-login-icone">
                        <IconeCadeado tamanho={22} />
                    </span>
                    <h1>Entrar no painel</h1>
                    <p>Use o e-mail e a senha da sua conta de administrador.</p>
                    {(aviso || erro || espera > 0) && (
                        <p className="a-alerta" role="alert">
                            {espera > 0 ? `Muitas tentativas erradas. Tente de novo em ${espera} s.` : erro || aviso}
                        </p>
                    )}
                    <Campo rotulo="E-mail">
                        {(id) => <input id={id} className="a-entrada-campo" type="email" inputMode="email" autoComplete="username" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@universalgames.com" />}
                    </Campo>
                    <Campo rotulo="Senha" dica={capsLock ? "Caps Lock está ligado." : ""}>
                        {(id) => (
                            <div className="a-senha">
                                <input
                                    id={id}
                                    className="a-entrada-campo"
                                    type={verSenha ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    maxLength={72}
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    onKeyUp={verCaps}
                                    onKeyDown={verCaps}
                                />
                                <button type="button" className="a-icone-botao" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Esconder senha" : "Mostrar senha"} aria-pressed={verSenha}>
                                    {verSenha ? <IconeOlhoFechado tamanho={18} /> : <IconeOlho tamanho={18} />}
                                </button>
                            </div>
                        )}
                    </Campo>
                    <button type="submit" className="a-botao primario largo a-botao-alto" disabled={entrando || espera > 0}>
                        {entrando ? "Entrando…" : "Entrar"}
                    </button>
                    <p className="a-login-nota">
                        <IconeEscudo tamanho={14} /> A permissão é conferida no servidor a cada ação. Contas de cliente não têm acesso ao painel.
                    </p>
                </form>
            </section>
        </main>
    );
}

// alterna entre o tema escuro e o claro do painel
function BotaoTema({ tema, alternar }) {
    const claro = tema === "claro";
    return (
        <button type="button" className="a-icone-botao a-botao-tema" onClick={alternar} aria-label={claro ? "Usar tema escuro" : "Usar tema claro"} title={claro ? "Tema escuro" : "Tema claro"}>
            {claro ? <IconeLua tamanho={18} /> : <IconeSol tamanho={18} />}
        </button>
    );
}

// tema salvo neste navegador; na primeira vez segue o do sistema
function useTemaPainel() {
    const sistemaClaro = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches;
    const [tema, setTema] = useArmazenamento("ug:tema-painel", sistemaClaro ? "claro" : "escuro");
    return [tema === "claro" ? "claro" : "escuro", () => setTema((t) => (t === "claro" ? "escuro" : "claro"))];
}

function Layout({ secao, parametro, usuario, aoAlterarCatalogo, tema, alternarTema }) {
    const { avisos, avisar, remover } = useAvisos();
    const [menuAberto, setMenuAberto] = useState(false);
    const [produtos, setProdutos] = useState(null);
    const [categorias, setCategorias] = useState(null);
    const [erroDados, setErroDados] = useState("");
    const [aguardando, setAguardando] = useState(0);

    const recarregar = useCallback(async () => {
        try {
            const [p, c] = await Promise.all([api.listarProdutos(), api.listarCategorias()]);
            setProdutos(p);
            setCategorias(c);
            setErroDados("");
        } catch (e) {
            setErroDados(e.message);
        }
    }, []);

    useEffect(() => {
        recarregar();
    }, [recarregar]);

    // toda alteração recarrega o painel e o catálogo da loja aberta nesta aba
    const aposAlterar = useCallback(async () => {
        await recarregar();
        aoAlterarCatalogo?.();
    }, [recarregar, aoAlterarCatalogo]);

    useEffect(() => setMenuAberto(false), [secao, parametro]);

    // número de reservas esperando a loja, no menu (confere a cada minuto e ao trocar de tela)
    useEffect(() => {
        let ativo = true;
        const contar = () =>
            api
                .contarAguardando()
                .then((n) => ativo && setAguardando(n))
                .catch(() => {});
        contar();
        const intervalo = setInterval(contar, 60000);
        return () => {
            ativo = false;
            clearInterval(intervalo);
        };
    }, [secao]);

    const contexto = { produtos, categorias, recarregar, aposAlterar, avisar, usuario, erroDados };
    const editando = secao === "produtos" && parametro;

    return (
        <ContextoAdmin.Provider value={contexto}>
            <div className={menuAberto ? "a-layout menu-aberto" : "a-layout"}>
                <aside className="a-lateral" aria-label="Menu do painel">
                    <a className="a-marca" href="#/admin">
                        <LogoMarca tamanho={34} />
                        <span>
                            Universal Games
                            <small>Painel da loja</small>
                        </span>
                    </a>
                    <nav className="a-nav">
                        {GRUPOS.map((grupo) => (
                            <div key={grupo} className="a-nav-grupo">
                                <span className="a-nav-titulo">{grupo}</span>
                                {SECOES.filter((s) => s.grupo === grupo).map(({ id, rotulo, Icone }) => (
                                    <a key={id} href={`#/admin/${id}`} className={secao === id ? "ativo" : ""} aria-current={secao === id ? "page" : undefined}>
                                        <Icone tamanho={18} />
                                        <span>{rotulo}</span>
                                        {id === "reservas" && aguardando > 0 && (
                                            <span className="a-nav-contador" title={`${aguardando} aguardando a loja`}>
                                                {aguardando}
                                            </span>
                                        )}
                                    </a>
                                ))}
                            </div>
                        ))}
                    </nav>
                    <div className="a-lateral-rodape">
                        <div className="a-perfil">
                            <span className="a-avatar" aria-hidden="true">
                                {usuario.email?.[0]?.toUpperCase() || "A"}
                            </span>
                            <span className="a-perfil-texto">
                                <strong title={usuario.email}>{usuario.email}</strong>
                                <small>Administrador</small>
                            </span>
                            <button type="button" className="a-icone-botao" onClick={sairDoPainel} aria-label="Sair do painel" title="Sair">
                                <IconeSair tamanho={17} />
                            </button>
                        </div>
                    </div>
                </aside>
                <div className="a-veu" onClick={() => setMenuAberto(false)} aria-hidden="true" />

                <div className="a-area">
                    <header className="a-topo-movel">
                        <button type="button" className="a-icone-botao" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
                            <IconeMenu tamanho={20} />
                        </button>
                        <span>{SECOES.find((s) => s.id === secao)?.rotulo || "Painel"}</span>
                        <BotaoTema tema={tema} alternar={alternarTema} />
                    </header>
                    <header className="a-topo">
                        <div className="a-topo-trilha">
                            <span>{SECOES.find((s) => s.id === secao)?.grupo || "Painel"}</span>
                            <span aria-hidden="true">/</span>
                            <strong>{SECOES.find((s) => s.id === secao)?.rotulo || "Painel"}</strong>
                        </div>
                        <div className="a-topo-acoes">
                            <span className="a-topo-data">{hojePorExtenso()}</span>
                            <BotaoTema tema={tema} alternar={alternarTema} />
                            <a className="a-botao" href="#/" target="_blank" rel="noreferrer">
                                <IconeExterno tamanho={15} /> Ver a loja
                            </a>
                            <a className="a-botao primario" href="#/admin/produtos/novo">
                                <IconeMais tamanho={15} /> Novo produto
                            </a>
                        </div>
                    </header>
                    <main className="a-conteudo" id="conteudo-admin">
                        <Suspense fallback={<Carregando />}>
                            {secao === "painel" && <Painel />}
                            {secao === "vendas" && <Vendas />}
                            {secao === "produtos" && (editando && /^(\d+|novo)$/.test(parametro) ? <ProdutoForm key={parametro} id={parametro === "novo" ? null : Number(parametro)} /> : <Produtos filtroInicial={parametro} />)}
                            {secao === "promocoes" && <Promocoes />}
                            {secao === "categorias" && <Categorias />}
                            {secao === "estoque" && <Estoque />}
                            {secao === "reservas" && <Reservas />}
                            {secao === "historico" && <Historico />}
                            {!SECOES.some((s) => s.id === secao) && <SecaoInexistente />}
                        </Suspense>
                    </main>
                </div>
            </div>
            <Avisos avisos={avisos} remover={remover} />
        </ContextoAdmin.Provider>
    );
}

function SecaoInexistente() {
    useEffect(() => navegar("/admin"), []);
    return null;
}
