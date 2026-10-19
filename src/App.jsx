import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import jogos from "./dadosJogos.js";
import acessorios from "./acessorios.js";
import { navegar, useArmazenamento, useAtalho, useEfeitosPonteiro, useRevelar, useRota, useTravarRolagem } from "./hooks.js";
import { LojaContext } from "./LojaContext.js";
import { calcularPrecoFinal, ehAcessorio, FILTROS_INICIAIS, imagensDoJogo, LIMITE_COMPARAR, recomendar } from "./utils.js";
import Abas from "./components/Abas.jsx";
import { VitrineAcessorios } from "./components/Acessorios.jsx";
import BandejaComparar from "./components/BandejaComparar.jsx";
import BannerDistribuidora from "./components/BannerDistribuidora.jsx";
import Destaques from "./components/Destaques.jsx";
import { GavetaCarrinho } from "./components/Gavetas.jsx";
import Header from "./components/Header.jsx";
import { IconeBiblioteca, IconeBussola, IconeCarrinho, IconeCasa, IconeComparar, IconeCoracao, IconeEtiqueta, IconeFone, IconeRecibo } from "./components/Icones.jsx";
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
const Biblioteca = lazy(() => import("./components/Biblioteca.jsx"));
const Pedidos = lazy(() => import("./components/Pedidos.jsx"));
const Desejos = lazy(() => import("./components/Desejos.jsx"));
const Comparar = lazy(() => import("./components/Comparar.jsx"));
const Checkout = lazy(() => import("./components/Checkout.jsx"));

const TITULOS = {
    loja: "Universal Games: loja de jogos digitais",
    explorar: "Explorar · Universal Games",
    acessorios: "Acessórios · Universal Games",
    biblioteca: "Biblioteca · Universal Games",
    pedidos: "Pedidos · Universal Games",
    desejos: "Lista de desejos · Universal Games",
    comparar: "Comparar · Universal Games",
    404: "Página não encontrada · Universal Games",
};

// Descrição de cada página para buscadores e para o preview de links compartilhados.
const DESCRICOES = {
    loja: `Loja de jogos digitais para PC e consoles: ${jogos.length} jogos com entrega instantânea, reembolso em até 7 dias, alertas de preço e comparador.`,
    explorar: `Explore os ${jogos.length} jogos do catálogo com filtros por gênero, plataforma, preço e avaliação.`,
    acessorios: `Mouse, teclado, headset, controles e acessórios para PC, console e celular. Frete grátis acima de R$ 199 e garantia de 12 meses.`,
    biblioteca: "Sua biblioteca de jogos com as chaves de ativação de cada compra.",
    pedidos: "Histórico de pedidos, comprovantes e reembolsos em até 7 dias.",
    desejos: "Sua lista de desejos com alertas de preço para cada jogo.",
    comparar: "Compare jogos lado a lado: preço, avaliação, plataformas e gêneros.",
    404: "Página não encontrada na Universal Games.",
};

function resumir(texto, limite = 155) {
    if (texto.length <= limite) return texto;
    return texto.slice(0, texto.lastIndexOf(" ", limite - 1)) + "…";
}

function definirMeta(seletor, valor) {
    document.querySelector(seletor)?.setAttribute("content", valor);
}

const porId = new Map([...jogos, ...acessorios].map((item) => [item.id, item]));
const buscarJogos = (ids) => ids.map((id) => porId.get(id)).filter(Boolean);

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

const vitrine = {
    destaques: jogos.filter((jogo) => jogo.destaque),
    ofertas: [...jogos].filter((jogo) => jogo.desconto > 0).sort((a, b) => b.desconto - a.desconto || b.nota - a.nota),
    melhores: [...jogos].sort((a, b) => b.nota - a.nota),
    lancamentos: [...jogos].filter((jogo) => jogo.lancamento >= 2021).sort((a, b) => b.lancamento - a.lancamento),
    categorias: CATEGORIAS.map(([nome, idJogo]) => ({ nome, jogo: porId.get(idJogo), quantidade: jogos.filter((j) => j.generos.includes(nome)).length })),
    residentEvil: jogos.filter((jogo) => jogo.nome.startsWith("Resident Evil")),
    soulslike: jogos.filter((jogo) => jogo.generos.includes("Soulslike")).sort((a, b) => b.nota - a.nota),
    // Jogos publicados pela Warner Bros. Games presentes no catálogo.
    warner: [38, 92, 4, 93, 28, 27, 94, 95].map((id) => porId.get(id)),
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

function Carregando() {
    return (
        <div className="pagina carregando" aria-busy="true" aria-label="Carregando">
            <span className="girador" />
        </div>
    );
}

function App() {
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
    const [checkout, setCheckout] = useState({ aberto: false, presente: false, carregado: false });
    const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
    const [notificacoes, setNotificacoes] = useState([]);
    const proximoId = useRef(0);

    const rota = useRota();
    useEfeitosPonteiro();
    useRevelar();
    const aberto = rota.id ? porId.get(rota.id) : null;
    const jogoAberto = rota.pagina === "jogo" && aberto && !ehAcessorio(aberto) ? aberto : null;
    const produtoAberto = rota.pagina === "produto" && ehAcessorio(aberto) ? aberto : null;

    const carrinho = useMemo(() => buscarJogos(idsCarrinho), [idsCarrinho]);
    const desejos = useMemo(() => buscarJogos(idsDesejos), [idsDesejos]);
    const vistos = useMemo(() => buscarJogos(idsVistos), [idsVistos]);
    const comparando = useMemo(() => buscarJogos(idsComparar), [idsComparar]);

    // Biblioteca = itens de pedidos pagos que não foram presentes.
    const biblioteca = useMemo(() => {
        const itens = new Map();
        for (const pedido of pedidos) {
            if (pedido.status !== "pago" || pedido.presente) continue;
            for (const item of pedido.itens) {
                const jogo = porId.get(item.id);
                if (ehAcessorio(jogo)) continue;
                if (jogo && !itens.has(item.id)) itens.set(item.id, { jogo, chave: item.chave, pago: item.pago, pedido });
            }
        }
        return [...itens.values()];
    }, [pedidos]);
    const idsPossuidos = useMemo(() => new Set(biblioteca.map((item) => item.jogo.id)), [biblioteca]);

    const alertasAtingidos = desejos.filter((jogo) => alertas[jogo.id] && calcularPrecoFinal(jogo) <= alertas[jogo.id]).length;

    useTravarRolagem(carrinhoAberto || paletaAberta || checkout.aberto);

    useEffect(() => {
        window.scrollTo({ top: 0 });
        // jogo inexistente também é 404
        const pagina = (rota.pagina === "jogo" && !jogoAberto) || (rota.pagina === "produto" && !produtoAberto) ? "404" : rota.pagina;
        const item = jogoAberto || produtoAberto;
        const titulo = item ? `${item.nome} · Universal Games` : TITULOS[pagina] || TITULOS.loja;
        const descricao = item ? resumir(`${item.nome}: ${item.descricao}`) : DESCRICOES[pagina] || DESCRICOES.loja;
        document.title = titulo;
        definirMeta('meta[name="description"]', descricao);
        definirMeta('meta[property="og:title"]', titulo);
        definirMeta('meta[property="og:description"]', descricao);
        definirMeta('meta[name="robots"]', pagina === "404" ? "noindex" : "index, follow");
        if (jogoAberto) setIdsVistos((ids) => [jogoAberto.id, ...ids.filter((id) => id !== jogoAberto.id)].slice(0, 12));
    }, [rota.pagina, jogoAberto, produtoAberto, setIdsVistos]);

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
    }, []);

    const possui = useCallback((id) => idsPossuidos.has(id), [idsPossuidos]);
    const estaNoCarrinho = useCallback((id) => idsCarrinho.includes(id), [idsCarrinho]);
    const estaNosDesejos = useCallback((id) => idsDesejos.includes(id), [idsDesejos]);
    const estaComparando = useCallback((id) => idsComparar.includes(id), [idsComparar]);

    const adicionarAoCarrinho = useCallback(
        (jogo) => {
            if (idsPossuidos.has(jogo.id)) {
                notificar(
                    <>
                        Você já possui <strong>{jogo.nome}</strong>. Para dar de presente, use “Presentear”.
                    </>,
                    { acao: { rotulo: "Biblioteca", aoClicar: () => navegar("/biblioteca") } },
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
        [idsCarrinho, idsPossuidos, setIdsCarrinho, notificar],
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

    const reembolsar = useCallback(
        (numero) => {
            setPedidos((lista) => lista.map((p) => (p.numero === numero ? { ...p, status: "reembolsado", reembolsadoEm: new Date().toISOString() } : p)));
            notificar(`Reembolso do pedido ${numero} aprovado. O valor volta pelo mesmo meio de pagamento.`);
        },
        [setPedidos, notificar],
    );

    const loja = useMemo(
        () => ({ abrirJogo, adicionarAoCarrinho, removerDoCarrinho, alternarDesejo, alternarComparar, estaNoCarrinho, estaNosDesejos, estaComparando, possui, reembolsar, notificar }),
        [abrirJogo, adicionarAoCarrinho, removerDoCarrinho, alternarDesejo, alternarComparar, estaNoCarrinho, estaNosDesejos, estaComparando, possui, reembolsar, notificar],
    );

    function abrirCheckout(presente = false) {
        setCarrinhoAberto(false);
        setCheckout({ aberto: true, presente, carregado: true });
    }

    function comprarAgora(jogo) {
        if (!idsCarrinho.includes(jogo.id)) setIdsCarrinho((ids) => [...ids, jogo.id]);
        abrirCheckout();
    }

    function presentear(jogo) {
        if (!idsCarrinho.includes(jogo.id)) setIdsCarrinho((ids) => [...ids, jogo.id]);
        abrirCheckout(true);
    }

    function concluirPedido(pedido) {
        setPedidos((lista) => [pedido, ...lista]);
        // guarda também o endereço, para a próxima compra de acessório já vir preenchida
        setPerfil((atual) => ({ ...atual, ...pedido.comprador, endereco: pedido.entrega?.endereco ?? atual.endereco }));
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
        { id: "explorar", rotulo: "Explorar catálogo", dica: "filtros por gênero, plataforma e preço", Icone: IconeBussola, executar: () => navegar("/explorar") },
        { id: "acessorios", rotulo: "Acessórios", dica: "mouse, teclado, headset, controles", Icone: IconeFone, executar: () => navegar("/acessorios") },
        { id: "ofertas", rotulo: "Ver ofertas", dica: "jogos em promoção", Icone: IconeEtiqueta, executar: () => aplicarFiltros({ somentePromocao: true, ordenar: "maior-desconto" }) },
        { id: "biblioteca", rotulo: "Minha biblioteca", dica: `${biblioteca.length} jogos · chaves de ativação`, Icone: IconeBiblioteca, executar: () => navegar("/biblioteca") },
        { id: "pedidos", rotulo: "Meus pedidos", dica: "comprovantes e reembolsos", Icone: IconeRecibo, executar: () => navegar("/pedidos") },
        { id: "desejos", rotulo: "Lista de desejos", dica: "alertas de preço", Icone: IconeCoracao, executar: () => navegar("/desejos") },
        { id: "comparar", rotulo: "Comparar jogos", dica: `${comparando.length} selecionados`, Icone: IconeComparar, executar: () => navegar("/comparar") },
        { id: "carrinho", rotulo: "Abrir carrinho", dica: `${carrinho.length} itens`, Icone: IconeCarrinho, executar: () => setCarrinhoAberto(true) },
    ];

    const paraVoce = recomendar(jogos, [...idsVistos, ...idsDesejos, ...idsPossuidos], [...idsPossuidos]);
    const sugestoesCarrinho = vitrine.ofertas.filter((j) => !idsCarrinho.includes(j.id) && !idsPossuidos.has(j.id)).slice(0, 3);
    const ofertasPromo = () => aplicarFiltros({ somentePromocao: true, ordenar: "maior-desconto" });

    function renderizarPagina() {
        switch (rota.pagina) {
            case "explorar":
                return <Catalogo jogos={jogos} filtros={filtros} setFiltros={setFiltros} />;
            case "404":
                return <NaoEncontrada sugestoes={vitrine.melhores.slice(0, 4)} abrirPaleta={abrirPaleta} />;
            case "acessorios":
                return <PaginaAcessorios acessorios={acessorios} />;
            case "produto":
                if (!produtoAberto) return <NaoEncontrada tipo="produto" sugestoes={vitrine.melhores.slice(0, 4)} abrirPaleta={abrirPaleta} />;
                return <PaginaProduto key={produtoAberto.id} produto={produtoAberto} acessorios={acessorios} comprarAgora={comprarAgora} />;
            case "jogo":
                if (!jogoAberto) return <NaoEncontrada tipo="jogo" sugestoes={vitrine.melhores.slice(0, 4)} abrirPaleta={abrirPaleta} />;
                return <PaginaJogo jogo={jogoAberto} jogos={jogos} comprarAgora={comprarAgora} presentear={presentear} aoEscolherGenero={(genero) => aplicarFiltros({ generos: [genero] })} />;
            case "biblioteca":
                return <Biblioteca itens={biblioteca} />;
            case "pedidos":
                return <Pedidos pedidos={pedidos} />;
            case "desejos":
                return <Desejos itens={desejos} alertas={alertas} definirAlerta={definirAlerta} />;
            case "comparar":
                return <Comparar jogos={comparando} />;
            default:
                return (
                    <>
                        <h1 className="so-leitor">Universal Games: loja de jogos digitais para PC e consoles</h1>
                        <BannerDistribuidora
                            distribuidora="Warner Bros."
                            subtitulo="Games"
                            personagem={porId.get(4)}
                            jogos={vitrine.warner}
                        />
                        <Destaques jogos={vitrine.destaques} />
                        <Garantias />
                        {paraVoce.length > 0 ? (
                            <Prateleira id="para-voce" titulo="Para você" descricao="Com base no que você viu, deseja e possui." jogos={paraVoce} />
                        ) : (
                            <Prateleira id="em-alta" titulo="Em alta" descricao="Os mais bem avaliados da loja." jogos={vitrine.melhores.slice(0, 10)} aoVerMais={() => aplicarFiltros({ ordenar: "melhor-avaliados" })} />
                        )}
                        <Ofertas jogos={vitrine.ofertas.slice(0, 5)} aoVerMais={ofertasPromo} />
                        <Abas abas={ABAS} aoVerMais={(aba) => aplicarFiltros(aba.filtros)} />
                        <Categorias categorias={vitrine.categorias} aoEscolher={(genero) => aplicarFiltros({ generos: [genero] })} />
                        <UniversoSouls jogos={vitrine.soulslike} aoVerTodos={() => aplicarFiltros({ generos: ["Soulslike"], ordenar: "melhor-avaliados" })} />
                        <BannerPromocao jogos={vitrine.ofertas.slice(0, 5)} fundo={porId.get(38)} aoClicar={ofertasPromo} />
                        {vistos.length > 0 && <Prateleira id="vistos" titulo="Vistos recentemente" jogos={vistos} />}
                        <UniversoResidentEvil jogos={vitrine.residentEvil} aoVerTodos={() => aplicarFiltros({ termo: "Resident Evil", ordenar: "mais-recentes" })} />
                        <Prateleira id="lancamentos" titulo="Lançamentos" jogos={vitrine.lancamentos.slice(0, 15)} aoVerMais={() => aplicarFiltros({ ordenar: "mais-recentes" })} />
                        <VitrineAcessorios acessorios={acessorios} />
                        <ChamadaCatalogo total={jogos.length} />
                    </>
                );
        }
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
                qtdBiblioteca={biblioteca.length}
                alertas={alertasAtingidos}
                abrirCarrinho={() => setCarrinhoAberto(true)}
                abrirPaleta={abrirPaleta}
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
                        presenteInicial={checkout.presente}
                        perfil={perfil}
                        concluir={concluirPedido}
                    />
                </Suspense>
            )}
            <Notificacoes itens={notificacoes} remover={removerNotificacao} />
        </LojaContext.Provider>
    );
}

export default App;
