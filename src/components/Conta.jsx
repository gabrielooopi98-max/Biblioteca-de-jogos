// Conta do cliente: entrar, criar conta (com confirmação por e-mail), recuperar a senha
// e, logado, ver as reservas da conta, editar os dados e cuidar da segurança.
import { useEffect, useMemo, useState } from "react";
import * as conta from "../conta.js";
import { navegar } from "../hooks.js";
import { forcaDaSenha, limparErros, regrasDaSenha, registrarErro, ROTULO_FORCA, senhaValida, esperaRestante } from "../senha.js";
import { formatarPreco, imagensDoJogo } from "../utils.js";
import { Imagem } from "./CardJogo.jsx";
import { IconeCadeado, IconeCheck, IconeCoracao, IconeEmail, IconeEscudo, IconeLoja, IconeOlho, IconeOlhoFechado, IconeRecibo, IconeSair, LogoMarca } from "./Icones.jsx";

const CHAVE_TENTATIVAS = "ug:tentativas-conta";
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// --- Peças do formulário ---
function Campo({ rotulo, erro, dica, children, id }) {
    return (
        <div className={erro ? "conta-campo com-erro" : "conta-campo"}>
            <label htmlFor={id}>{rotulo}</label>
            {children}
            {erro ? <small className="conta-erro-campo">{erro}</small> : dica && <small>{dica}</small>}
        </div>
    );
}

function CampoSenha({ id, valor, aoMudar, autoComplete, placeholder }) {
    const [ver, setVer] = useState(false);
    return (
        <div className="conta-senha">
            <input id={id} type={ver ? "text" : "password"} value={valor} onChange={(e) => aoMudar(e.target.value)} autoComplete={autoComplete} placeholder={placeholder} required maxLength={72} />
            <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Esconder senha" : "Mostrar senha"} aria-pressed={ver}>
                {ver ? <IconeOlhoFechado tamanho={18} /> : <IconeOlho tamanho={18} />}
            </button>
        </div>
    );
}

function ForcaSenha({ senha, contexto }) {
    const forca = forcaDaSenha(senha, contexto);
    const regras = regrasDaSenha(senha, contexto);
    return (
        <div className="conta-forca" aria-live="polite">
            <div className={`conta-forca-barra nivel-${forca}`}>
                {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={senha && i < Math.max(forca, 1) ? "cheia" : ""} />
                ))}
            </div>
            {senha && <span className="conta-forca-rotulo">{ROTULO_FORCA[forca]}</span>}
            <ul className="conta-regras">
                {regras.map(([texto, ok]) => (
                    <li key={texto} className={ok ? "ok" : ""}>
                        <IconeCheck tamanho={13} /> {texto}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Alerta({ tom = "erro", children }) {
    if (!children) return null;
    return (
        <p className={`conta-alerta ${tom}`} role={tom === "erro" ? "alert" : "status"}>
            {children}
        </p>
    );
}

// contagem regressiva do bloqueio depois de muitos erros
function useEspera(chave) {
    const [segundos, setSegundos] = useState(() => esperaRestante(chave));
    useEffect(() => {
        if (!segundos) return;
        const t = setInterval(() => setSegundos(esperaRestante(chave)), 1000);
        return () => clearInterval(t);
    }, [segundos, chave]);
    return [segundos, () => setSegundos(esperaRestante(chave))];
}

// --- Moldura das telas de acesso: arte de jogos à esquerda, formulário à direita ---
function MolduraAcesso({ jogos, children }) {
    const capas = useMemo(
        () =>
            [...jogos]
                .filter((j) => j.appId)
                .sort((a, b) => b.nota - a.nota)
                .slice(0, 12),
        [jogos],
    );
    return (
        <div className="conta-acesso">
            <aside className="conta-arte" aria-hidden="true">
                <div className="conta-mosaico">
                    {capas.map((j) => (
                        <Imagem key={j.id} src={imagensDoJogo(j).capaPequena} alt="" />
                    ))}
                </div>
                <div className="conta-arte-texto">
                    <span className="conta-arte-marca">
                        <LogoMarca tamanho={44} />
                        <span>
                            Universal <em>Games</em>
                        </span>
                    </span>
                    <h2>Sua próxima aventura começa aqui.</h2>
                    <ul>
                        <li>
                            <IconeRecibo tamanho={18} /> Acompanhe suas reservas de qualquer aparelho
                        </li>
                        <li>
                            <IconeLoja tamanho={18} /> Reserve online e retire na loja
                        </li>
                        <li>
                            <IconeCoracao tamanho={18} /> Salve os jogos que você quer
                        </li>
                        <li>
                            <IconeEscudo tamanho={18} /> Conta protegida com confirmação por e-mail
                        </li>
                    </ul>
                </div>
            </aside>
            <section className="conta-painel">{children}</section>
        </div>
    );
}

function Entrar({ ir, aviso }) {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const [espera, atualizarEspera] = useEspera(CHAVE_TENTATIVAS);
    const [semConfirmar, setSemConfirmar] = useState(false);

    async function enviar(e) {
        e.preventDefault();
        if (espera) return;
        setErro("");
        setSemConfirmar(false);
        setOcupado(true);
        try {
            await conta.entrar(email, senha);
            limparErros(CHAVE_TENTATIVAS);
        } catch (falha) {
            const naoConfirmado = /Confirme seu e-mail/.test(falha.message);
            if (!naoConfirmado) registrarErro(CHAVE_TENTATIVAS);
            setSemConfirmar(naoConfirmado);
            setErro(falha.message);
            atualizarEspera();
            setSenha("");
        } finally {
            setOcupado(false);
        }
    }

    return (
        <form className="conta-form" onSubmit={enviar} noValidate>
            <header>
                <h1>Entrar</h1>
                <p>Bem-vindo de volta! Entre para ver suas reservas e finalizar mais rápido.</p>
            </header>
            <Alerta tom="ok">{aviso}</Alerta>
            <Alerta>{espera ? `Muitas tentativas. Tente de novo em ${espera} s.` : erro}</Alerta>
            {semConfirmar && (
                <button type="button" className="conta-link" onClick={() => ir("enviado", email)}>
                    Reenviar o e-mail de confirmação
                </button>
            )}
            <Campo rotulo="E-mail" id="entrar-email">
                <input id="entrar-email" type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} placeholder="voce@exemplo.com" />
            </Campo>
            <Campo rotulo="Senha" id="entrar-senha">
                <CampoSenha id="entrar-senha" valor={senha} aoMudar={setSenha} autoComplete="current-password" placeholder="Sua senha" />
            </Campo>
            <button type="button" className="conta-link direita" onClick={() => ir("esqueci", email)}>
                Esqueci minha senha
            </button>
            <button type="submit" className="botao botao-cheio botao-grande botao-largo" disabled={ocupado || Boolean(espera) || !EMAIL_VALIDO.test(email.trim()) || !senha}>
                {ocupado ? "Entrando…" : "Entrar"}
            </button>
            <div className="conta-divisor">
                <span>Novo na Universal Games?</span>
            </div>
            <button type="button" className="botao botao-secundario botao-grande botao-largo" onClick={() => ir("criar", email)}>
                Criar conta grátis
            </button>
        </form>
    );
}

function Criar({ ir, emailInicial }) {
    const [dados, setDados] = useState({ nome: "", email: emailInicial || "", telefone: "", senha: "", confirmar: "", aceito: false, site: "" });
    const [tocado, setTocado] = useState({});
    const [erro, setErro] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const mudar = (campo) => (e) => setDados((d) => ({ ...d, [campo]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
    const tocar = (campo) => () => setTocado((t) => ({ ...t, [campo]: true }));
    const contexto = { email: dados.email, nome: dados.nome };

    const erros = {
        nome: dados.nome.trim().length < 3 ? "Digite seu nome completo." : "",
        email: !EMAIL_VALIDO.test(dados.email.trim()) ? "Digite um e-mail válido." : "",
        telefone: dados.telefone && dados.telefone.replace(/\D/g, "").length < 10 ? "Telefone com DDD, só números." : "",
        senha: !senhaValida(dados.senha, contexto) ? "A senha ainda não atende a todas as regras." : "",
        confirmar: dados.confirmar !== dados.senha ? "As senhas não são iguais." : "",
        aceito: !dados.aceito ? "Aceite os termos para continuar." : "",
    };
    const valido = Object.values(erros).every((v) => !v);

    async function enviar(e) {
        e.preventDefault();
        setTocado({ nome: true, email: true, telefone: true, senha: true, confirmar: true, aceito: true });
        if (!valido) return;
        setErro("");
        setOcupado(true);
        try {
            // campo invisível preenchido = robô: finge que deu certo e não cria nada
            if (dados.site) return ir("enviado", dados.email);
            const { precisaConfirmar } = await conta.criarConta(dados);
            if (precisaConfirmar) ir("enviado", dados.email);
        } catch (falha) {
            setErro(falha.message);
        } finally {
            setOcupado(false);
        }
    }

    const mostrar = (campo) => (tocado[campo] ? erros[campo] : "");
    return (
        <form className="conta-form" onSubmit={enviar} noValidate>
            <header>
                <h1>Criar conta</h1>
                <p>Leva menos de um minuto. Você confirma o e-mail e já pode reservar.</p>
            </header>
            <Alerta>{erro}</Alerta>
            <Campo rotulo="Nome completo" id="criar-nome" erro={mostrar("nome")}>
                <input id="criar-nome" autoComplete="name" value={dados.nome} onChange={mudar("nome")} onBlur={tocar("nome")} required maxLength={80} placeholder="Como está no documento" />
            </Campo>
            <div className="conta-dupla">
                <Campo rotulo="E-mail" id="criar-email" erro={mostrar("email")}>
                    <input id="criar-email" type="email" inputMode="email" autoComplete="email" value={dados.email} onChange={mudar("email")} onBlur={tocar("email")} required maxLength={254} placeholder="voce@exemplo.com" />
                </Campo>
                <Campo rotulo="Celular (opcional)" id="criar-tel" erro={mostrar("telefone")}>
                    <input id="criar-tel" type="tel" inputMode="tel" autoComplete="tel" value={dados.telefone} onChange={mudar("telefone")} onBlur={tocar("telefone")} maxLength={20} placeholder="(11) 91234-5678" />
                </Campo>
            </div>
            <Campo rotulo="Senha" id="criar-senha" erro={tocado.senha && dados.senha && erros.senha ? erros.senha : ""}>
                <CampoSenha id="criar-senha" valor={dados.senha} aoMudar={(v) => setDados((d) => ({ ...d, senha: v }))} autoComplete="new-password" placeholder="Crie uma senha forte" />
            </Campo>
            <ForcaSenha senha={dados.senha} contexto={contexto} />
            <Campo rotulo="Confirme a senha" id="criar-confirmar" erro={tocado.confirmar || dados.confirmar.length >= dados.senha.length ? mostrar("confirmar") || (dados.confirmar && erros.confirmar) : ""}>
                <CampoSenha id="criar-confirmar" valor={dados.confirmar} aoMudar={(v) => setDados((d) => ({ ...d, confirmar: v }))} autoComplete="new-password" placeholder="Digite a senha de novo" />
            </Campo>
            {/* armadilha para robôs: pessoas não veem este campo */}
            <div className="conta-armadilha" aria-hidden="true">
                <label htmlFor="criar-site">Site</label>
                <input id="criar-site" tabIndex={-1} autoComplete="off" value={dados.site} onChange={mudar("site")} />
            </div>
            <label className={mostrar("aceito") ? "conta-aceite com-erro" : "conta-aceite"}>
                <input type="checkbox" checked={dados.aceito} onChange={mudar("aceito")} />
                <span>Concordo em receber e-mails sobre minhas reservas e que meus dados sejam usados só para atender meus pedidos na Universal Games.</span>
            </label>
            {mostrar("aceito") && <small className="conta-erro-campo">{erros.aceito}</small>}
            <button type="submit" className="botao botao-cheio botao-grande botao-largo" disabled={ocupado}>
                {ocupado ? "Criando conta…" : "Criar conta"}
            </button>
            <p className="conta-rodape-form">
                Já tem conta?{" "}
                <button type="button" className="conta-link" onClick={() => ir("entrar", dados.email)}>
                    Entrar
                </button>
            </p>
        </form>
    );
}

function Enviado({ ir, email }) {
    const [espera, setEspera] = useState(60);
    const [mensagem, setMensagem] = useState("");
    useEffect(() => {
        if (!espera) return;
        const t = setTimeout(() => setEspera((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [espera]);

    async function reenviar() {
        setMensagem("");
        try {
            await conta.reenviarConfirmacao(email);
            setMensagem("Enviamos de novo. Confira também a caixa de spam.");
        } catch (falha) {
            setMensagem(falha.message);
        }
        setEspera(60);
    }

    return (
        <div className="conta-form conta-centro">
            <span className="conta-icone-grande">
                <IconeEmail tamanho={30} />
            </span>
            <header>
                <h1>Confirme seu e-mail</h1>
                <p>
                    Se o endereço <strong>{email}</strong> puder ser usado, você vai receber um link para ativar a conta. Abra o e-mail <strong>neste aparelho</strong> e clique no link.
                </p>
            </header>
            <Alerta tom="ok">{mensagem}</Alerta>
            <button type="button" className="botao botao-secundario botao-grande botao-largo" onClick={reenviar} disabled={espera > 0 || !email}>
                {espera > 0 ? `Reenviar e-mail em ${espera} s` : "Reenviar e-mail"}
            </button>
            <button type="button" className="conta-link" onClick={() => ir("entrar", email)}>
                Voltar para entrar
            </button>
        </div>
    );
}

function Esqueci({ ir, emailInicial }) {
    const [email, setEmail] = useState(emailInicial || "");
    const [enviado, setEnviado] = useState(false);
    const [erro, setErro] = useState("");
    const [ocupado, setOcupado] = useState(false);

    async function enviar(e) {
        e.preventDefault();
        setErro("");
        setOcupado(true);
        try {
            await conta.pedirNovaSenha(email);
            setEnviado(true);
        } catch (falha) {
            setErro(falha.message);
        } finally {
            setOcupado(false);
        }
    }

    return (
        <form className="conta-form" onSubmit={enviar} noValidate>
            <header>
                <h1>Recuperar senha</h1>
                <p>Digite o e-mail da sua conta. Mandamos um link para você criar uma senha nova.</p>
            </header>
            {/* mesma resposta com ou sem conta: ninguém descobre quem é cliente da loja */}
            <Alerta tom="ok">{enviado && "Se existir uma conta com esse e-mail, o link chega em alguns minutos. Abra-o neste aparelho."}</Alerta>
            <Alerta>{erro}</Alerta>
            <Campo rotulo="E-mail" id="esqueci-email">
                <input id="esqueci-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} />
            </Campo>
            <button type="submit" className="botao botao-cheio botao-grande botao-largo" disabled={ocupado || enviado || !EMAIL_VALIDO.test(email.trim())}>
                {ocupado ? "Enviando…" : enviado ? "Link enviado" : "Enviar link"}
            </button>
            <button type="button" className="conta-link" onClick={() => ir("entrar", email)}>
                Voltar para entrar
            </button>
        </form>
    );
}

function NovaSenha({ usuario, aoConcluir }) {
    const [senha, setSenha] = useState("");
    const [confirmar, setConfirmar] = useState("");
    const [erro, setErro] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const contexto = { email: usuario?.email || "", nome: usuario?.user_metadata?.nome || "" };

    async function enviar(e) {
        e.preventDefault();
        if (!senhaValida(senha, contexto) || senha !== confirmar) return;
        setErro("");
        setOcupado(true);
        try {
            await conta.definirSenha(senha);
            aoConcluir();
        } catch (falha) {
            setErro(falha.message);
        } finally {
            setOcupado(false);
        }
    }

    return (
        <form className="conta-form" onSubmit={enviar} noValidate>
            <header>
                <h1>Criar nova senha</h1>
                <p>Escolha uma senha que você não usa em outros sites.</p>
            </header>
            <Alerta>{erro}</Alerta>
            <Campo rotulo="Nova senha" id="nova-senha">
                <CampoSenha id="nova-senha" valor={senha} aoMudar={setSenha} autoComplete="new-password" />
            </Campo>
            <ForcaSenha senha={senha} contexto={contexto} />
            <Campo rotulo="Confirme a nova senha" id="nova-confirmar" erro={confirmar && confirmar !== senha ? "As senhas não são iguais." : ""}>
                <CampoSenha id="nova-confirmar" valor={confirmar} aoMudar={setConfirmar} autoComplete="new-password" />
            </Campo>
            <button type="submit" className="botao botao-cheio botao-grande botao-largo" disabled={ocupado || !senhaValida(senha, contexto) || senha !== confirmar}>
                {ocupado ? "Salvando…" : "Salvar nova senha"}
            </button>
        </form>
    );
}

// --- Área do cliente logado ---
const SITUACAO = {
    aguardando: ["Aguardando a loja", "aviso"],
    confirmado: ["Pronta para retirar", "ok"],
    retirado: ["Retirada", "neutro"],
    cancelado: ["Cancelada", "apagado"],
};

function ReservasDaConta() {
    const [lista, setLista] = useState(null);
    const [erro, setErro] = useState("");
    useEffect(() => {
        conta
            .minhasReservas()
            .then(setLista)
            .catch(() => setErro("Não foi possível carregar as reservas da conta agora."));
    }, []);

    if (erro) return <p className="conta-vazio">{erro}</p>;
    if (!lista) return <div className="conta-carregando" aria-busy="true" />;
    if (!lista.length)
        return (
            <div className="conta-vazio">
                <IconeRecibo tamanho={26} />
                <strong>Nenhuma reserva nesta conta ainda</strong>
                <span>As reservas que você fizer logado aparecem aqui, em qualquer aparelho.</span>
                <a href="#/explorar" className="botao botao-secundario">
                    Ver jogos
                </a>
            </div>
        );
    return (
        <ul className="conta-reservas">
            {lista.map((r) => {
                const [rotulo, tom] = SITUACAO[r.status] || [r.status, "neutro"];
                const aberta = r.status === "aguardando" || r.status === "confirmado";
                return (
                    <li key={r.numero}>
                        <div className="conta-reserva-topo">
                            <span className="conta-mono">{r.numero}</span>
                            <span className={`conta-selo ${tom}`}>{rotulo}</span>
                        </div>
                        <p>{r.itens.map((i) => i.nome).join(", ")}</p>
                        <div className="conta-reserva-rodape">
                            <small>{new Date(r.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</small>
                            {aberta && (
                                <small>
                                    Código de retirada <strong className="conta-mono">{r.codigo}</strong>
                                </small>
                            )}
                            <strong>{formatarPreco(Number(r.total))}</strong>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

function DadosPessoais({ usuario, aoSalvar }) {
    const [nome, setNome] = useState(usuario.user_metadata?.nome || "");
    const [telefone, setTelefone] = useState(usuario.user_metadata?.telefone || "");
    const [estado, setEstado] = useState({ ocupado: false, msg: "", erro: "" });
    const mudou = nome !== (usuario.user_metadata?.nome || "") || telefone !== (usuario.user_metadata?.telefone || "");

    async function salvar(e) {
        e.preventDefault();
        if (nome.trim().length < 3) return setEstado({ ocupado: false, msg: "", erro: "Digite seu nome completo." });
        setEstado({ ocupado: true, msg: "", erro: "" });
        try {
            aoSalvar(await conta.salvarDados({ nome, telefone }));
            setEstado({ ocupado: false, msg: "Dados salvos.", erro: "" });
        } catch (falha) {
            setEstado({ ocupado: false, msg: "", erro: falha.message });
        }
    }

    return (
        <form className="conta-cartao" onSubmit={salvar}>
            <h2>Dados pessoais</h2>
            <p className="conta-cartao-dica">Usados para preencher suas reservas automaticamente.</p>
            <Alerta tom="ok">{estado.msg}</Alerta>
            <Alerta>{estado.erro}</Alerta>
            <Campo rotulo="Nome completo" id="dados-nome">
                <input id="dados-nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} />
            </Campo>
            <Campo rotulo="E-mail" id="dados-email" dica="Para trocar o e-mail, fale com a loja.">
                <input id="dados-email" value={usuario.email} disabled />
            </Campo>
            <Campo rotulo="Celular" id="dados-tel">
                <input id="dados-tel" type="tel" autoComplete="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} maxLength={20} />
            </Campo>
            <button type="submit" className="botao botao-secundario" disabled={!mudou || estado.ocupado}>
                {estado.ocupado ? "Salvando…" : "Salvar dados"}
            </button>
        </form>
    );
}

function Seguranca({ usuario }) {
    const [aberto, setAberto] = useState(false);
    const [atual, setAtual] = useState("");
    const [nova, setNova] = useState("");
    const [estado, setEstado] = useState({ ocupado: false, msg: "", erro: "" });
    const contexto = { email: usuario.email, nome: usuario.user_metadata?.nome || "" };

    async function trocar(e) {
        e.preventDefault();
        if (!senhaValida(nova, contexto)) return;
        setEstado({ ocupado: true, msg: "", erro: "" });
        try {
            await conta.trocarSenha(usuario.email, atual, nova);
            setEstado({ ocupado: false, msg: "Senha alterada.", erro: "" });
            setAtual("");
            setNova("");
            setAberto(false);
        } catch (falha) {
            setEstado({ ocupado: false, msg: "", erro: falha.message });
        }
    }

    return (
        <div className="conta-cartao">
            <h2>Segurança</h2>
            <ul className="conta-seguranca">
                <li>
                    <IconeCheck tamanho={15} /> E-mail confirmado
                </li>
                <li>
                    <IconeCadeado tamanho={15} /> Último acesso: {usuario.last_sign_in_at ? new Date(usuario.last_sign_in_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "agora"}
                </li>
            </ul>
            <Alerta tom="ok">{estado.msg}</Alerta>
            {aberto ? (
                <form onSubmit={trocar} className="conta-form-interno">
                    <Alerta>{estado.erro}</Alerta>
                    <Campo rotulo="Senha atual" id="seg-atual">
                        <CampoSenha id="seg-atual" valor={atual} aoMudar={setAtual} autoComplete="current-password" />
                    </Campo>
                    <Campo rotulo="Nova senha" id="seg-nova">
                        <CampoSenha id="seg-nova" valor={nova} aoMudar={setNova} autoComplete="new-password" />
                    </Campo>
                    <ForcaSenha senha={nova} contexto={contexto} />
                    <div className="conta-acoes">
                        <button type="button" className="botao botao-fantasma" onClick={() => setAberto(false)}>
                            Cancelar
                        </button>
                        <button type="submit" className="botao botao-cheio" disabled={estado.ocupado || !atual || !senhaValida(nova, contexto)}>
                            {estado.ocupado ? "Salvando…" : "Trocar senha"}
                        </button>
                    </div>
                </form>
            ) : (
                <button type="button" className="botao botao-secundario" onClick={() => setAberto(true)}>
                    Trocar senha
                </button>
            )}
            <div className="conta-sair">
                <button type="button" className="botao botao-fantasma" onClick={() => conta.sair()}>
                    <IconeSair tamanho={16} /> Sair desta conta
                </button>
                <button type="button" className="conta-link perigo" onClick={() => conta.sair(true)}>
                    Sair de todos os aparelhos
                </button>
            </div>
        </div>
    );
}

function MinhaConta({ usuario, setConta, aviso }) {
    const nome = usuario.user_metadata?.nome || usuario.email.split("@")[0];
    const desde = new Date(usuario.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return (
        <div className="conta-area">
            <header className="conta-topo">
                <span className="conta-avatar" aria-hidden="true">
                    {nome[0]?.toUpperCase()}
                </span>
                <div>
                    <h1>Olá, {nome.split(" ")[0]}!</h1>
                    <p>
                        {usuario.email} · cliente desde {desde}
                    </p>
                </div>
                <a href="#/explorar" className="botao botao-cheio">
                    Continuar comprando
                </a>
            </header>
            <Alerta tom="ok">{aviso}</Alerta>
            <div className="conta-grade">
                <section className="conta-cartao">
                    <div className="conta-cartao-topo">
                        <h2>Reservas da conta</h2>
                        <a href="#/reservas" className="conta-link">
                            Reservas deste aparelho
                        </a>
                    </div>
                    <ReservasDaConta />
                </section>
                <div className="conta-coluna">
                    <DadosPessoais usuario={usuario} aoSalvar={(u) => setConta((c) => ({ ...c, usuario: u }))} />
                    <Seguranca usuario={usuario} />
                </div>
            </div>
        </div>
    );
}

export default function Conta({ estado, setConta, jogos }) {
    const [tela, setTela] = useState({ modo: "entrar", email: "" });
    const ir = (modo, email = "") => setTela({ modo, email });
    const { pronta, usuario, redefinir, aviso } = estado;

    // página de conta fora dos buscadores
    useEffect(() => {
        const meta = document.querySelector('meta[name="robots"]');
        const antes = meta?.getAttribute("content");
        meta?.setAttribute("content", "noindex");
        return () => antes && meta?.setAttribute("content", antes);
    }, []);

    if (!conta.clientes)
        return (
            <div className="pagina conta-indisponivel">
                <h1>Contas indisponíveis</h1>
                <p>A loja está em modo de demonstração, sem servidor. Você ainda pode reservar normalmente.</p>
                <button type="button" className="botao botao-secundario" onClick={() => navegar("/")}>
                    Voltar para a loja
                </button>
            </div>
        );
    if (!pronta) return <div className="pagina conta-carregando grande" aria-busy="true" />;

    if (redefinir)
        return (
            <div className="pagina pagina-conta">
                <MolduraAcesso jogos={jogos}>
                    <NovaSenha usuario={usuario} aoConcluir={() => setConta((c) => ({ ...c, redefinir: false, aviso: "Senha nova salva. Você já está conectado." }))} />
                </MolduraAcesso>
            </div>
        );

    if (usuario)
        return (
            <div className="pagina pagina-conta">
                <MinhaConta usuario={usuario} setConta={setConta} aviso={aviso} />
            </div>
        );

    return (
        <div className="pagina pagina-conta">
            <MolduraAcesso jogos={jogos}>
                <div className="conta-marca-movel">
                    <LogoMarca tamanho={36} />
                    <span>
                        Universal <em>Games</em>
                    </span>
                </div>
                {tela.modo !== "enviado" && tela.modo !== "esqueci" && (
                    <div className="conta-abas" role="tablist">
                        <button type="button" role="tab" aria-selected={tela.modo === "entrar"} className={tela.modo === "entrar" ? "ativa" : ""} onClick={() => ir("entrar", tela.email)}>
                            Entrar
                        </button>
                        <button type="button" role="tab" aria-selected={tela.modo === "criar"} className={tela.modo === "criar" ? "ativa" : ""} onClick={() => ir("criar", tela.email)}>
                            Criar conta
                        </button>
                    </div>
                )}
                {tela.modo === "entrar" && <Entrar ir={ir} aviso={aviso} />}
                {tela.modo === "criar" && <Criar ir={ir} emailInicial={tela.email} />}
                {tela.modo === "enviado" && <Enviado ir={ir} email={tela.email} />}
                {tela.modo === "esqueci" && <Esqueci ir={ir} emailInicial={tela.email} />}
                <p className="conta-seguro">
                    <IconeCadeado tamanho={13} /> Conexão segura. Nunca pedimos sua senha por e-mail ou WhatsApp.
                </p>
            </MolduraAcesso>
        </div>
    );
}
