import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import jogosLocais from "./dadosJogos.js";
import acessoriosLocais, { definirCategorias } from "./acessorios.js";
import { carregarCatalogo, catalogoGuardado } from "./catalogo.js";
import { navegar, useArmazenamento, useAtalho, useConta, useEfeitosPonteiro, useRota, useTravarRolagem } from "./hooks.js";
import { LojaContext } from "./LojaContext.js";
import { calcularPrecoFinal, ehAcessorio, FILTROS_INICIAIS, imagensDoJogo, LIMITE_COMPARAR, recomendar, situacaoReserva } from "./utils.js";
import Abas from "./components/Abas.jsx";
import { Departamentos, VitrineAcessorios } from "./components/Acessorios.jsx";
import BandejaComparar from "./components/BandejaComparar.jsx";
import BannerDistribuidora from "./components/BannerDistribuidora.jsx";
import Destaques from "./components/Destaques.jsx";
import { GavetaCarrinho } from "./components/Gavetas.jsx";
import Header from "./components/Header.jsx";
import ConviteConta from "./components/ConviteConta.jsx";
import { IconeBussola, IconeCadeado, IconeCarrinho, IconeCasa, IconeComparar, IconeCoracao, IconeEtiqueta, IconeFone, IconeRecibo } from "./components/Icones.jsx";
import NaoEncontrada from "./components/NaoEncontrada.jsx";
import Notificacoes from "./components/Notificacoes.jsx";
import PaletaComandos from "./components/PaletaComandos.jsx";
import { BannerPromocao, Categorias, ChamadaCatalogo, Garantias, Ofertas, Prateleira, Rodape } from "./components/Secoes.jsx";
import { UniversoResidentEvil, UniversoSouls } from "./components/Universos.jsx";
import "./App.css";

// Páginas secundárias carregadas sob demanda: a loja abre mais rápido.
const Catalogo = lazy(() => import("./components/Catalogo.jsx"));
const PaginaJogo = lazy(() => import("./components/PaginaJogo.jsx"));
const PaginaAcessorios = lazy(() => import("./components/Acessorios.jsx"));
const PaginaProduto = lazy(() => import("./components/PaginaProduto.jsx"));
const Pedidos = lazy(() => import("./components/Pedidos.jsx"));
const Desejos = lazy(() => import("./components/Desejos.jsx"));
const Comparar = lazy(() => import("./components/Comparar.jsx"));
const Checkout = lazy(() => import("./components/Checkout.jsx"));
const Conta = lazy(() => import("./components/Conta.jsx"));
// painel administrativo: carregado só por quem abre #/admin (a loja não baixa nada dele)
const Admin = lazy(() => import("./admin/Admin.jsx"));

const TITULOS = {
    loja: "Universal Games: jogos e acessórios com retirada na loja",
    explorar: "Jogos · Universal Games",
    acessorios: "Produtos · Universal Games",
    reservas: "Minhas reservas · Universal Games",
    desejos: "Lista de desejos · Universal Games",
    comparar: "Comparar · Universal Games",
    conta: "Minha conta · Universal Games",
    404: "Página não encontrada · Universal Games",
};

// Descrição de cada página para buscadores e para o preview de links compartilhados.
const descricoes = (totalJogos) => ({
    loja: `Universal Games: ${totalJogos} jogos para PlayStation e Xbox, além de acessórios para console, PC e celular. Reserve pelo site e retire na loja.`,
    explorar: `Explore os ${totalJogos} jogos do catálogo com filtros por gênero, plataforma, preço e avaliação.`,
    acessorios: `Celulares, tablets, video games, caixas de som, TV, patinete elétrico, acessórios e mais. Reserve pelo site e retire na loja, com garantia de 12 meses.`,
    reservas: "Suas reservas: situação do pagamento, código de retirada e prazo para retirar na loja.",
    desejos: "Sua lista de desejos com alertas de preço para cada jogo.",
    comparar: "Compare jogos lado a lado: preço, avaliação, plataformas e gêneros.",
    conta: "Entre ou crie sua conta na Universal Games para acompanhar suas reservas de qualquer aparelho.",
    404: "Página não encontrada na Universal Games.",
});

function resumir(texto, limite = 155) {
    if (texto.length <= limite) return texto;
    return texto.slice(0, texto.lastIndexOf(" ", limite - 1)) + "…";
}

function definirMeta(seletor, valor) {
    document.querySelector(seletor)?.setAttribute("content", valor);
}

const CATEGORIAS = [
    ["RPG", 2],
    ["Soulslike", 25],
    ["Terror", 40],
    ["Sobrevivência", 12],
    ["Mundo Aberto", 5],
    ["Super-herói", 9],
    ["Metroidvania", 26],
    ["Ficção Científica", 3],
];

// Até 10 clássicos de cada console vendido pela loja (por appId da Steam).
const CLASSICOS = [
    ["PS5", [1245620, 2322010, 2651280, 1086940, 2358720, 1903340, 1895880, 1649240, 2515020, 1659420]],
    ["PS4", [292030, 1174180, 1593500, 1817070, 2215430, 1687950, 374320, 582010, 814380, 1259420]],
    ["PS3", [3240220, 489830, 2668510, 12210, 200260, 35140, 620, 21690, 8870, 22380]],
    ["PS2", [12120, 254700, 2131650, 359870, 2552430, 631510, 13600, 587620, 12200, 3830]],
    ["Xbox Series X/S", [1551360, 1240440, 976730, 1097840, 1716740, 1172620, 1057090, 2677660, 1817230, 1091500]],
    ["Xbox 360", [3240220, 489830, 2668510, 12210, 108710, 550, 288470, 22380, 8870, 620]],
];
// Listas da página inicial montadas a partir do catálogo (arquivo local ou banco).
function montarLoja(jogos, acessorios) {
    const porId = new Map([...jogos, ...acessorios].map((item) => [item.id, item]));
    const buscarJogos = (ids) => ids.map((id) => porId.get(id)).filter(Boolean);
    const vitrine = {
        destaques: jogos.filter((jogo) => jogo.destaque),
        ofertas: [...jogos].filter((jogo) => jogo.desconto > 0).sort((a, b) => b.desconto - a.desconto || b.nota - a.nota),
        melhores: [...jogos].sort((a, b) => b.nota - a.nota),
        lancamentos: [...jogos].filter((jogo) => jogo.lancamento >= 2021).sort((a, b) => b.lancamento - a.lancamento),
        categorias: CATEGORIAS.map(([nome, idJogo]) => ({ nome, jogo: porId.get(idJogo), quantidade: jogos.filter((j) => j.generos.includes(nome)).length })).filter((c) => c.jogo),
        residentEvil: jogos.filter((jogo) => jogo.nome.startsWith("Resident Evil")),
        soulslike: jogos.filter((jogo) => jogo.generos.includes("Soulslike")).sort((a, b) => b.nota - a.nota),
        // Jogos publicados pela Warner Bros. Games presentes no catálogo.
        warner: [38, 92, 4, 93, 28, 27, 94, 95].map((id) => porId.get(id)).filter(Boolean),
    };

    const ABAS = [
        { titulo: "Novidades", jogos: vitrine.lancamentos.slice(0, 8), filtros: { ordenar: "mais-recentes" } },
        { titulo: "Mais bem avaliados", jogos: vitrine.melhores.slice(0, 8), filtros: { ordenar: "melhor-avaliados" } },
        { titulo: "Em promoção", jogos: vitrine.ofertas.slice(0, 8), filtros: { somentePromocao: true, ordenar: "maior-desconto" } },
        {
            titulo: "Até R$ 30",
            jogos: [...jogos].filter((j) => calcularPrecoFinal(j) <= 30).sort((a, b) => b.nota - a.nota).slice(0, 8),
            filtros: { precoMax: 30, ordenar: "melhor-avaliados" },
        },
    ];
    const porAppId = new Map(jogos.map((jogo) => [jogo.appId, jogo]));
    const ABAS_CLASSICOS = CLASSICOS.map(([plataforma, appIds]) => ({
        titulo: plataforma,
        jogos: appIds.map((appId) => porAppId.get(appId)).filter((jogo) => jogo?.plataformas.includes(plataforma)),
        filtros: { plataformas: [plataforma], ordenar: "melhor-avaliados" },
    }));
    return { porId, buscarJogos, vitrine, ABAS, ABAS_CLASSICOS };
}

function Carregando() {
    return (
        <div className="pagina carregando" aria-busy="true" aria-label="Carregando">
            <span className="girador" />
        </div>
    );
}

function App() {
    // Catálogo: começa com o último recebido do banco (ou com os arquivos locais) e se atualiza com o banco.
    const [catalogo, setCatalogo] = useState(() => {
        const guardado = catalogoGuardado();
        if (guardado) definirCategorias(guardado.categorias);
        return guardado || { jogos: jogosLocais, acessorios: acessoriosLocais };
    });
    const { jogos, acessorios } = catalogo;
    const { porId, buscarJogos, vitrine, ABAS, ABAS_CLASSICOS } = useMemo(() => montarLoja(jogos, acessorios), [jogos, acessorios]);
    const totalJogos = jogos.length;
    const recarregarCatalogo = useCallback(
        () =>
            carregarCatalogo()
                .then((dados) => {
                    if (!dados) return;
                    definirCategorias(dados.categorias);
                    setCatalogo(dados);
                })
                .catch(() => {
                    // banco fora do ar: a loja segue com o catálogo que já tem
                }),
        [],
    );
    useEffect(() => {
        recarregarCatalogo();
    }, [recarregarCatalogo]);
    const [idsCarrinho, setIdsCarrinho] = useArmazenamento("bj:carrinho", []);
    const [idsDesejos, setIdsDesejos] = useArmazenamento("bj:desejos", []);
    const [idsVistos, setIdsVistos] = useArmazenamento("bj:vistos", []);
    const [idsComparar, setIdsComparar] = useArmazenamento("bj:comparar", []);
    const [alertas, setAlertas] = useArmazenamento("bj:alertas", {});
    const [pedidos, setPedidos] = useArmazenamento("bj:pedidos", []);
    const [perfil, setPerfil] = useArmazenamento("bj:perfil", { nome: "", email: "" });
    const [cupom, setCupom] = useArmazenamento("bj:cupom", null);
    const [carrinhoAberto, setCarrinhoAberto] = useState(false);
    const [paletaAberta, setPaletaAberta] = useState(false);
    const [checkout, setCheckout] = useState({ aberto: false, carregado: false });
    const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
    // departamento aberto na página Produtos (os atalhos da loja abrem já filtrado)
    const [categoriaProdutos, setCategoriaProdutos] = useState("todos");
    const [notificacoes, setNotificacoes] = useState([]);
    const proximoId = useRef(0);

    const rota = useRota();
    const [conta, setConta] = useConta();
    const usuario = conta.usuario;
    // saiu da página Produtos: na próxima visita ela abre em "Todos"
    const paginaAnterior = useRef(rota.pagina);
    useEffect(() => {
        if (paginaAnterior.current === "acessorios" && rota.pagina !== "acessorios") setCategoriaProdutos("todos");
        paginaAnterior.current = rota.pagina;
    }, [rota.pagina]);
    useEfeitosPonteiro();
    const aberto = rota.id ? porId.get(rota.id) : null;
    const jogoAberto = rota.pagina === "jogo" && aberto && !ehAcessorio(aberto) ? aberto : null;
    const produtoAberto = rota.pagina === "produto" && ehAcessorio(aberto) ? aberto : null;

    const carrinho = useMemo(() => buscarJogos(idsCarrinho), [idsCarrinho, buscarJogos]);
    const desejos = useMemo(() => buscarJogos(idsDesejos), [idsDesejos, buscarJogos]);
    const vistos = useMemo(() => buscarJogos(idsVistos), [idsVistos, buscarJogos]);
    const comparando = useMemo(() => buscarJogos(idsComparar), [idsComparar, buscarJogos]);

    // Reservas que ainda vão ser retiradas (aguardando confirmação ou prontas).
    // A situação depende da hora: setTique redesenha a tela quando a loja confirma um pagamento.
    const [, setTique] = useState(0);
    const reservasAtivas = pedidos.filter((p) => ["aguardando", "pronto"].includes(situacaoReserva(p).id)).length;

    const alertasAtingidos = desejos.filter((jogo) => alertas[jogo.id] && calcularPrecoFinal(jogo) <= alertas[jogo.id]).length;

    useTravarRolagem(carrinhoAberto || paletaAberta || checkout.aberto);

    // nova página: volta ao topo (só quando a página muda, não quando o catálogo do banco chega)
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [rota.pagina, rota.id]);

    useEffect(() => {
        // jogo inexistente também é 404
        const pagina = (rota.pagina === "jogo" && !jogoAberto) || (rota.pagina === "produto" && !produtoAberto) ? "404" : rota.pagina;
        const item = jogoAberto || produtoAberto;
        const titulo = item ? `${item.nome} · Universal Games` : TITULOS[pagina] || TITULOS.loja;
        const textos = descricoes(totalJogos);
        const descricao = item ? resumir(`${item.nome}: ${item.descricao}`) : textos[pagina] || textos.loja;
        document.title = titulo;
        definirMeta('meta[name="description"]', descricao);
        definirMeta('meta[property="og:title"]', titulo);
        definirMeta('meta[property="og:description"]', descricao);
        definirMeta('meta[name="robots"]', pagina === "404" ? "noindex" : "index, follow");
        if (jogoAberto) setIdsVistos((ids) => [jogoAberto.id, ...ids.filter((id) => id !== jogoAberto.id)].slice(0, 12));
    }, [rota.pagina, jogoAberto, produtoAberto, setIdsVistos, totalJogos]);

    // Com a loja aberta e o navegador ocioso, já baixa as páginas mais visitadas: a navegação fica instantânea.
    useEffect(() => {
        const preCarregar = () => {
            import("./components/Catalogo.jsx");
            import("./components/PaginaJogo.jsx");
        };
        if ("requestIdleCallback" in window) {
            const id = requestIdleCallback(preCarregar, { timeout: 4000 });
            return () => cancelIdleCallback(id);
        }
        const tempo = setTimeout(preCarregar, 2500);
        return () => clearTimeout(tempo);
    }, []);

    // Marca como "saindo" para a animação de saída rodar antes de remover.
    const removerNotificacao = useCallback((id) => {
        setNotificacoes((atuais) => atuais.map((n) => (n.id === id ? { ...n, saindo: true } : n)));
        setTimeout(() => setNotificacoes((atuais) => atuais.filter((n) => n.id !== id)), 240);
    }, []);

    const notificar = useCallback(
        (mensagem, opcoes = {}) => {
            const id = ++proximoId.current;
            setNotificacoes((atuais) => [...atuais.slice(-2), { id, mensagem, ...opcoes }]);
            setTimeout(() => removerNotificacao(id), 4200);
        },
        [removerNotificacao],
    );

    // abre a página certa para cada item: jogo ou acessório
    const abrirJogo = useCallback((id) => {
        setCarrinhoAberto(false);
        navegar(ehAcessorio(porId.get(id)) ? `/produto/${id}` : `/jogo/${id}`);
    }, [porId]);

    const estaNoCarrinho = useCallback((id) => idsCarrinho.includes(id), [idsCarrinho]);
    const estaNosDesejos = useCallback((id) => idsDesejos.includes(id), [idsDesejos]);
    const estaComparando = useCallback((id) => idsComparar.includes(id), [idsComparar]);

    const adicionarAoCarrinho = useCallback(
        (jogo) => {
            if (jogo.esgotado) {
                notificar(
                    <>
                        <strong>{jogo.nome}</strong> está esgotado no momento.
                    </>,
                );
                return;
            }
            if (idsCarrinho.includes(jogo.id)) {
                setCarrinhoAberto(true);
                return;
            }
            setIdsCarrinho((ids) => [...ids, jogo.id]);
            notificar(
                <>
                    <strong>{jogo.nome}</strong> adicionado ao carrinho
                </>,
                { imagem: imagensDoJogo(jogo).horizontal, acao: { rotulo: "Ver carrinho", aoClicar: () => setCarrinhoAberto(true) } },
            );
        },
        [idsCarrinho, setIdsCarrinho, notificar],
    );

    const removerDoCarrinho = useCallback((id) => setIdsCarrinho((ids) => ids.filter((item) => item !== id)), [setIdsCarrinho]);

    const alternarDesejo = useCallback(
        (jogo) => {
            const jaExiste = idsDesejos.includes(jogo.id);
            setIdsDesejos((ids) => (jaExiste ? ids.filter((id) => id !== jogo.id) : [jogo.id, ...ids]));
            notificar(
                <>
                    <strong>{jogo.nome}</strong> {jaExiste ? "removido da" : "adicionado à"} lista de desejos
                </>,
                { tipo: "desejo", acao: jaExiste ? undefined : { rotulo: "Ver lista", aoClicar: () => navegar("/desejos") } },
            );
        },
        [idsDesejos, setIdsDesejos, notificar],
    );

    const alternarComparar = useCallback(
        (jogo) => {
            if (idsComparar.includes(jogo.id)) {
                setIdsComparar((ids) => ids.filter((id) => id !== jogo.id));
                return;
            }
            if (idsComparar.length >= LIMITE_COMPARAR) {
                notificar(`Você pode comparar até ${LIMITE_COMPARAR} jogos. Remova um para adicionar outro.`);
                return;
            }
            setIdsComparar((ids) => [...ids, jogo.id]);
        },
        [idsComparar, setIdsComparar, notificar],
    );

    // Cancelar: no banco (devolve o estoque lá) ou, na demonstração, só neste navegador.
    const cancelarReserva = useCallback(
        async (numero) => {
            const pedido = pedidos.find((p) => p.numero === numero);
            if (!pedido) return;
            if (pedido.remoto) {
                const { mensagemDeErro } = await import("./supabase.js");
                const { clientes } = await import("./conta.js");
                const { error } = await clientes.rpc("cancelar_reserva", { p_numero: numero, p_codigo: pedido.retirada.codigo });
                if (error) {
                    notificar(mensagemDeErro(error));
                    return;
                }
                setPedidos((lista) => lista.map((p) => (p.numero === numero ? { ...p, situacaoLoja: { ...p.situacaoLoja, status: "cancelado", cancelado_em: new Date().toISOString() } } : p)));
            } else {
                setPedidos((lista) => lista.map((p) => (p.numero === numero ? { ...p, status: "cancelado", canceladoEm: new Date().toISOString() } : p)));
            }
            const pago = pedido.metodo !== "loja" && (!pedido.remoto || pedido.situacaoLoja?.pagamento === "confirmado");
            notificar(pago ? `Reserva ${numero} cancelada. O valor volta pelo mesmo meio de pagamento.` : `Reserva ${numero} cancelada.`);
        },
        [pedidos, setPedidos, notificar],
    );

    // Com o banco: confere a situação das reservas em aberto (a loja confirma pelo painel) e avisa quando ficam prontas.
    useEffect(() => {
        const abertas = pedidos.filter((p) => p.remoto && ["aguardando", "pronto"].includes(situacaoReserva(p).id));
        if (!abertas.length) return;
        let ativo = true;
        async function atualizar() {
            const { clientes } = await import("./conta.js");
            const { data, error } = await clientes.rpc("consultar_reservas", { p_reservas: abertas.map((p) => ({ numero: p.numero, codigo: p.retirada.codigo })) });
            if (!ativo || error || !data) return;
            const novas = new Map(data.filter((d) => {
                const antes = abertas.find((p) => p.numero === d.numero)?.situacaoLoja || {};
                return antes.status !== d.status || antes.pagamento !== d.pagamento;
            }).map((d) => [d.numero, d]));
            if (!novas.size) return;
            for (const d of novas.values()) {
                const antes = abertas.find((p) => p.numero === d.numero)?.situacaoLoja || {};
                if (d.status === "confirmado" && antes.status !== "confirmado") {
                    notificar(
                        <>
                            Pedido <strong>{d.numero}</strong> pronto para retirada na loja
                        </>,
                        { acao: { rotulo: "Ver reserva", aoClicar: () => navegar("/reservas") } },
                    );
                }
            }
            setPedidos((lista) => lista.map((p) => (novas.has(p.numero) ? { ...p, situacaoLoja: novas.get(p.numero) } : p)));
        }
        atualizar();
        const intervalo = setInterval(atualizar, 30000);
        return () => {
            ativo = false;
            clearInterval(intervalo);
        };
    }, [pedidos, setPedidos, notificar]);

    // Demonstração (sem banco): quando a "loja confirma o pagamento", avisa que o pedido está pronto para retirada.
    useEffect(() => {
        const tempos = pedidos
            .filter((pedido) => !pedido.remoto)
            .map((pedido) => ({ pedido, situacao: situacaoReserva(pedido) }))
            .filter(({ situacao }) => situacao.id === "aguardando")
            .map(({ pedido, situacao }) =>
                setTimeout(
                    () => {
                        setTique((t) => t + 1);
                        notificar(
                            <>
                                Pedido <strong>{pedido.numero}</strong> pronto para retirada na loja
                            </>,
                            { acao: { rotulo: "Ver reserva", aoClicar: () => navegar("/reservas") } },
                        );
                    },
                    situacao.confirmadoEm - Date.now() + 50,
                ),
            );
        return () => tempos.forEach(clearTimeout);
    }, [pedidos, notificar]);

    const loja = useMemo(
        () => ({ abrirJogo, adicionarAoCarrinho, removerDoCarrinho, alternarDesejo, alternarComparar, estaNoCarrinho, estaNosDesejos, estaComparando, cancelarReserva, notificar }),
        [abrirJogo, adicionarAoCarrinho, removerDoCarrinho, alternarDesejo, alternarComparar, estaNoCarrinho, estaNosDesejos, estaComparando, cancelarReserva, notificar],
    );

    function abrirCheckout() {
        setCarrinhoAberto(false);
        setCheckout({ aberto: true, carregado: true });
    }

    function comprarAgora(jogo) {
        if (!idsCarrinho.includes(jogo.id)) setIdsCarrinho((ids) => [...ids, jogo.id]);
        abrirCheckout();
    }

    function concluirPedido(pedido) {
        setPedidos((lista) => [pedido, ...lista]);
        // guarda nome, e-mail e celular para a próxima reserva já vir preenchida
        setPerfil((atual) => ({ ...atual, ...pedido.comprador }));
        setIdsCarrinho([]);
        setCupom(null);
    }

    function definirAlerta(jogo, valor) {
        setAlertas((atuais) => {
            const novos = { ...atuais };
            if (valor) novos[jogo.id] = valor;
            else delete novos[jogo.id];
            return novos;
        });
        if (valor) notificar(valor >= calcularPrecoFinal(jogo) ? `${jogo.nome} já está no seu preço-alvo!` : `Alerta criado: avisaremos quando ${jogo.nome} chegar ao seu preço.`);
    }

    // departamento da loja: "jogos" vai para o catálogo de jogos, o resto para Produtos já filtrado
    function abrirDepartamento(id) {
        if (id === "jogos") return navegar("/explorar");
        setCategoriaProdutos(id);
        navegar("/acessorios");
    }

    function aplicarFiltros(parcial) {
        setFiltros((atuais) => ({ ...FILTROS_INICIAIS, ordenar: atuais.ordenar, ...parcial }));
        navegar("/explorar");
    }

    const abrirPaleta = useCallback(() => setPaletaAberta(true), []);
    const comCtrlK = useCallback((e) => (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k", []);
    const comBarra = useCallback((e) => e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName), []);
    useAtalho(comCtrlK, abrirPaleta);
    useAtalho(comBarra, abrirPaleta);

    const comandos = [
        { id: "loja", rotulo: "Ir para a loja", Icone: IconeCasa, executar: () => navegar("/") },
        { id: "explorar", rotulo: "Jogos", dica: "catálogo com filtros por console, gênero e preço", Icone: IconeBussola, executar: () => navegar("/explorar") },
        { id: "acessorios", rotulo: "Produtos", dica: "celulares, video games, som, TV e acessórios", Icone: IconeFone, executar: () => abrirDepartamento("todos") },
        { id: "ofertas", rotulo: "Ver ofertas", dica: "jogos em promoção", Icone: IconeEtiqueta, executar: () => aplicarFiltros({ somentePromocao: true, ordenar: "maior-desconto" }) },
        { id: "reservas", rotulo: "Minhas reservas", dica: `${reservasAtivas} ativas · código de retirada`, Icone: IconeRecibo, executar: () => navegar("/reservas") },
        { id: "desejos", rotulo: "Lista de desejos", dica: "alertas de preço", Icone: IconeCoracao, executar: () => navegar("/desejos") },
        { id: "comparar", rotulo: "Comparar jogos", dica: `${comparando.length} selecionados`, Icone: IconeComparar, executar: () => navegar("/comparar") },
        { id: "conta", rotulo: usuario ? "Minha conta" : "Entrar ou criar conta", dica: usuario?.email || "acompanhe suas reservas", Icone: IconeCadeado, executar: () => navegar("/conta") },
        { id: "carrinho", rotulo: "Abrir carrinho", dica: `${carrinho.length} itens`, Icone: IconeCarrinho, executar: () => setCarrinhoAberto(true) },
    ];

    const paraVoce = recomendar(jogos, [...idsVistos, ...idsDesejos], []);
    const sugestoesCarrinho = vitrine.ofertas.filter((j) => !idsCarrinho.includes(j.id)).slice(0, 3);
    const ofertasPromo = () => aplicarFiltros({ somentePromocao: true, ordenar: "maior-desconto" });

    function renderizarPagina() {
        switch (rota.pagina) {
            case "explorar":
                return <Catalogo jogos={jogos} filtros={filtros} setFiltros={setFiltros} />;
            case "404":
                return <NaoEncontrada sugestoes={vitrine.melhores.slice(0, 4)} abrirPaleta={abrirPaleta} />;
            case "acessorios":
                return <PaginaAcessorios acessorios={acessorios} categoria={categoriaProdutos} setCategoria={setCategoriaProdutos} />;
            case "produto":
                if (!produtoAberto) return <NaoEncontrada tipo="produto" sugestoes={vitrine.melhores.slice(0, 4)} abrirPaleta={abrirPaleta} />;
                return <PaginaProduto key={produtoAberto.id} produto={produtoAberto} acessorios={acessorios} comprarAgora={comprarAgora} />;
            case "jogo":
                if (!jogoAberto) return <NaoEncontrada tipo="jogo" sugestoes={vitrine.melhores.slice(0, 4)} abrirPaleta={abrirPaleta} />;
                return <PaginaJogo jogo={jogoAberto} jogos={jogos} comprarAgora={comprarAgora} aoEscolherGenero={(genero) => aplicarFiltros({ generos: [genero] })} />;
            case "reservas":
                return <Pedidos pedidos={pedidos} />;
            case "desejos":
                return <Desejos itens={desejos} alertas={alertas} definirAlerta={definirAlerta} />;
            case "comparar":
                return <Comparar jogos={comparando} />;
            case "conta":
                return <Conta estado={conta} setConta={setConta} jogos={jogos} />;
            default:
                return (
                    <>
                        <h1 className="so-leitor">Universal Games: jogos, celulares, video games e acessórios com reserva pelo site e retirada na loja</h1>
                        <BannerDistribuidora
                            titulo="Melhores"
                            destaque="descontos"
                            personagem={porId.get(4)}
                            jogos={vitrine.warner}
                        />
                        <Departamentos acessorios={acessorios} imagemJogos={imagensDoJogo(porId.get(25)).capa} totalJogos={jogos.length} aoEscolher={abrirDepartamento} />
                        <VitrineAcessorios
                            id="mais-vendidos"
                            titulo="Mais procurados da loja"
                            descricao="Celulares, video games, som, TV e o que você usa todo dia."
                            acessorios={acessorios}
                            departamentos={["celulares", "videogames", "audio", "tv", "diadia"]}
                            aoVerTodos={abrirDepartamento}
                        />
                        <Destaques jogos={vitrine.destaques} />
                        <Garantias />
                        {paraVoce.length > 0 ? (
                            <Prateleira id="para-voce" titulo="Para você" descricao="Com base no que você viu e deseja." jogos={paraVoce} />
                        ) : (
                            <Prateleira id="em-alta" titulo="Em alta" descricao="Os mais bem avaliados da loja." jogos={vitrine.melhores.slice(0, 10)} aoVerMais={() => aplicarFiltros({ ordenar: "melhor-avaliados" })} />
                        )}
                        <Ofertas jogos={vitrine.ofertas.slice(0, 5)} aoVerMais={ofertasPromo} />
                        <Abas abas={ABAS} aoVerMais={(aba) => aplicarFiltros(aba.filtros)} />
                        <VitrineAcessorios
                            id="acessorios"
                            titulo="Acessórios e periféricos"
                            descricao="Controles, fones, carregadores e tudo para jogar melhor no console, no PC e no celular."
                            acessorios={acessorios}
                            departamentos={["videogames", "pc", "celular", "streaming"]}
                            aoVerTodos={abrirDepartamento}
                        />
                        <Abas
                            id="classicos"
                            titulo="Clássicos de cada console"
                            descricao="Do PS2 ao PS5, do Xbox 360 ao Series X/S: os jogos que marcaram cada geração."
                            abas={ABAS_CLASSICOS}
                            aoVerMais={(aba) => aplicarFiltros(aba.filtros)}
                        />
                        <Categorias categorias={vitrine.categorias} aoEscolher={(genero) => aplicarFiltros({ generos: [genero] })} />
                        <UniversoSouls jogos={vitrine.soulslike} aoVerTodos={() => aplicarFiltros({ generos: ["Soulslike"], ordenar: "melhor-avaliados" })} />
                        <BannerPromocao jogos={vitrine.ofertas.slice(0, 5)} fundo={porId.get(38)} aoClicar={ofertasPromo} />
                        {vistos.length > 0 && <Prateleira id="vistos" titulo="Vistos recentemente" jogos={vistos} />}
                        <UniversoResidentEvil jogos={vitrine.residentEvil} aoVerTodos={() => aplicarFiltros({ termo: "Resident Evil", ordenar: "mais-recentes" })} />
                        <Prateleira id="lancamentos" titulo="Lançamentos" jogos={vitrine.lancamentos.slice(0, 15)} aoVerMais={() => aplicarFiltros({ ordenar: "mais-recentes" })} />
                        <ChamadaCatalogo total={jogos.length} />
                    </>
                );
        }
    }

    if (rota.pagina === "admin") {
        return (
            <Suspense fallback={<Carregando />}>
                <Admin secao={rota.secao} parametro={rota.parametro} aoAlterarCatalogo={recarregarCatalogo} />
            </Suspense>
        );
    }

    return (
        <LojaContext.Provider value={loja}>
            <a
                className="pular-conteudo"
                href="#conteudo"
                onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("conteudo")?.focus();
                }}
            >
                Pular para o conteúdo
            </a>
            <Header
                pagina={rota.pagina}
                qtdCarrinho={carrinho.length}
                qtdDesejos={desejos.length}
                qtdReservas={reservasAtivas}
                alertas={alertasAtingidos}
                abrirCarrinho={() => setCarrinhoAberto(true)}
                abrirPaleta={abrirPaleta}
                usuario={usuario}
                contaPronta={conta.pronta}
            />

            <main id="conteudo" className="conteudo" tabIndex={-1}>
                <Suspense fallback={<Carregando />}>{renderizarPagina()}</Suspense>
            </main>

            <Rodape />

            <BandejaComparar jogos={comparando} limpar={() => setIdsComparar([])} oculta={rota.pagina === "comparar"} />
            <PaletaComandos aberta={paletaAberta} fechar={() => setPaletaAberta(false)} jogos={[...jogos, ...acessorios]} comandos={comandos} />
            <GavetaCarrinho
                aberta={carrinhoAberto}
                fechar={() => setCarrinhoAberto(false)}
                itens={carrinho}
                sugestoes={sugestoesCarrinho}
                cupom={cupom}
                setCupom={setCupom}
                irParaCheckout={() => abrirCheckout()}
            />
            {checkout.carregado && (
                <Suspense fallback={null}>
                    <Checkout
                        aberto={checkout.aberto}
                        fechar={() => setCheckout((c) => ({ ...c, aberto: false }))}
                        itens={carrinho}
                        cupom={cupom}
                        perfil={
                            usuario
                                ? { ...perfil, nome: usuario.user_metadata?.nome || perfil.nome, email: usuario.email, telefone: usuario.user_metadata?.telefone || perfil.telefone || "" }
                                : perfil
                        }
                        logado={Boolean(usuario)}
                        concluir={concluirPedido}
                    />
                </Suspense>
            )}
            <Notificacoes itens={notificacoes} remover={removerNotificacao} />
            <ConviteConta mostrar={conta.pronta && !usuario && rota.pagina !== "conta" && !checkout.aberto} />
        </LojaContext.Provider>
    );
}

export default App;
