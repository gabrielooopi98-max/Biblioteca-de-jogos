// Cadastro e edição de produto: campos por tipo (jogo ou acessório), preço e promoção, imagens e estoque.
// Valida aqui para avisar rápido; o banco valida de novo (preço, promoção, permissões) ao salvar.
import { useEffect, useMemo, useRef, useState } from "react";
import { navegar } from "../../utilidades/hooks.js";
import { IconeExterno, IconeLixeira } from "../../componentes/comum/Icones.jsx";
import * as api from "../servicos/api.js";
import { CampoGaleria, CampoImagem } from "../componentes/CampoImagem.jsx";
import { CamposPromocao } from "../componentes/CamposPromocao.jsx";
import { Cabecalho, Campo, Carregando, Confirmacao, Etiquetas, Interruptor } from "../componentes/ui.jsx";
import { dataHora, deCampoData, errosPromocao, lerPreco, paraCampoData, paraSlug, STATUS_PRODUTO, useAdmin } from "../servicos/util.js";

const CONSOLES = ["PS5", "PS4", "PS3", "PS2", "Xbox Series X/S", "Xbox 360"];
const CDN_STEAM = "https://cdn.cloudflare.steamstatic.com/steam/apps";
const ehUrl = (v) => /^(https?:)?\/\//.test(v || "");

const VAZIO = {
    tipo: "acessorio", nome: "", slug: "", categoria_id: "", status: "rascunho", descricao_curta: "", descricao: "",
    preco: "", promocao_ativa: false, preco_promocional: "", promocao_inicio: "", promocao_fim: "",
    plataformas: [], generos: [], desenvolvedora: "", lancamento: "", formato: "midia_fisica", requisitos: "", nota: "", app_id: "", destaque: false,
    marca: "", modelo: "", compatibilidade: [], especificacoes: "", variacoes: [], avaliacoes: "", controla_estoque: false, estoque: "", estoque_minimo: "3",
    imagem_principal: null, imagem_capa: null, galeria: [],
};

const texto = (v) => (v == null ? "" : String(v));
const decimal = (v) => (v == null ? "" : String(v).replace(".", ","));

function paraFormulario(p) {
    return {
        tipo: p.tipo, nome: p.nome, slug: p.slug, categoria_id: texto(p.categoria_id), status: p.status, descricao_curta: texto(p.descricao_curta), descricao: texto(p.descricao),
        preco: decimal(p.preco), promocao_ativa: p.promocao_ativa, preco_promocional: decimal(p.preco_promocional),
        promocao_inicio: paraCampoData(p.promocao_inicio), promocao_fim: paraCampoData(p.promocao_fim),
        plataformas: p.plataformas || [], generos: p.generos || [], desenvolvedora: texto(p.desenvolvedora), lancamento: texto(p.lancamento), formato: p.formato || "midia_fisica",
        requisitos: texto(p.requisitos), nota: decimal(p.nota), app_id: texto(p.app_id), destaque: Boolean(p.destaque),
        marca: texto(p.marca), modelo: texto(p.modelo), compatibilidade: p.compatibilidade || [], especificacoes: (p.especificacoes || []).join("\n"), variacoes: p.variacoes || [],
        avaliacoes: texto(p.avaliacoes), controla_estoque: p.controla_estoque, estoque: texto(p.estoque), estoque_minimo: texto(p.estoque_minimo ?? 3),
        imagem_principal: p.imagem_principal, imagem_capa: p.imagem_capa, galeria: (p.galeria || []).map((url) => ({ url })),
    };
}

const inteiro = (v) => (v === "" || v == null ? null : Number(v));
const nulo = (v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v);

// Formulário → colunas do banco (as imagens entram depois do envio)
function paraBanco(f) {
    const jogo = f.tipo === "jogo";
    return {
        tipo: f.tipo, nome: f.nome.trim(), slug: f.slug.trim(), categoria_id: f.categoria_id || null, status: f.status,
        descricao_curta: nulo(f.descricao_curta), descricao: nulo(f.descricao),
        preco: lerPreco(f.preco), promocao_ativa: f.promocao_ativa,
        preco_promocional: f.promocao_ativa || f.preco_promocional ? lerPreco(f.preco_promocional) : null,
        promocao_inicio: f.promocao_ativa ? deCampoData(f.promocao_inicio) : null, promocao_fim: f.promocao_ativa ? deCampoData(f.promocao_fim) : null,
        nota: f.nota === "" ? null : lerPreco(f.nota),
        plataformas: jogo ? f.plataformas : [], generos: jogo ? f.generos : [], desenvolvedora: jogo ? nulo(f.desenvolvedora) : null,
        lancamento: jogo ? inteiro(f.lancamento) : null, formato: jogo ? f.formato : null, requisitos: jogo ? nulo(f.requisitos) : null,
        app_id: jogo ? inteiro(f.app_id) : null, destaque: jogo ? f.destaque : false,
        marca: jogo ? null : nulo(f.marca), modelo: jogo ? null : nulo(f.modelo), compatibilidade: jogo ? [] : f.compatibilidade,
        especificacoes: jogo ? [] : f.especificacoes.split("\n").map((l) => l.trim()).filter(Boolean), variacoes: jogo ? [] : f.variacoes,
        avaliacoes: jogo ? null : inteiro(f.avaliacoes),
        controla_estoque: !jogo && f.controla_estoque, estoque: !jogo && f.controla_estoque ? inteiro(f.estoque) : null, estoque_minimo: inteiro(f.estoque_minimo) ?? 3,
    };
}

function validar(f, produtos, id) {
    const e = {};
    if (f.nome.trim().length < 2) e.nome = "Informe o nome (pelo menos 2 letras).";
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) e.slug = "Use só letras minúsculas, números e hífens (ex.: controle-sem-fio).";
    else if (produtos?.some((p) => p.slug === f.slug && p.id !== id)) e.slug = "Outro produto já usa esse endereço.";
    if (!f.categoria_id) e.categoria_id = "Escolha a categoria.";
    const preco = lerPreco(f.preco);
    if (preco == null) e.preco = "Informe o preço.";
    else if (Number.isNaN(preco) || preco < 0) e.preco = "Preço inválido.";
    Object.assign(e, errosPromocao(f));
    if (f.nota !== "") {
        const n = lerPreco(f.nota);
        if (Number.isNaN(n) || n < 0 || n > 10) e.nota = "Nota de 0 a 10.";
    }
    if (f.tipo === "jogo") {
        if (f.lancamento && (!/^\d{4}$/.test(f.lancamento) || f.lancamento < 1970 || f.lancamento > 2100)) e.lancamento = "Ano com 4 dígitos.";
        if (f.app_id && !/^\d{1,10}$/.test(f.app_id)) e.app_id = "Só números.";
        if (!f.plataformas.length) e.plataformas = "Escolha pelo menos uma plataforma.";
    } else if (f.controla_estoque && !/^\d+$/.test(String(f.estoque))) e.estoque = "Quantidade inteira, 0 ou mais.";
    if (!/^\d+$/.test(String(f.estoque_minimo))) e.estoque_minimo = "Número inteiro.";
    return e;
}

export default function ProdutoForm({ id }) {
    const { produtos, categorias, aposAlterar, avisar } = useAdmin();
    const [original, setOriginal] = useState(id ? undefined : null);
    const [form, setForm] = useState(VAZIO);
    const [slugManual, setSlugManual] = useState(Boolean(id));
    const [pendentes, setPendentes] = useState({ principal: null, capa: null });
    const [erros, setErros] = useState({});
    const [salvando, setSalvando] = useState("");
    const [erroGeral, setErroGeral] = useState("");
    const [apagando, setApagando] = useState(false);
    const [erroCarregar, setErroCarregar] = useState("");
    const previas = useRef([]);

    useEffect(() => {
        if (!id) return;
        let ativo = true;
        api.obterProduto(id)
            .then((p) => {
                if (!ativo) return;
                setOriginal(p);
                setForm(paraFormulario(p));
            })
            .catch((e) => ativo && setErroCarregar(e.message));
        return () => {
            ativo = false;
        };
    }, [id]);

    // libera a memória das prévias ao sair do formulário
    useEffect(() => () => previas.current.forEach((url) => URL.revokeObjectURL(url)), []);

    const categoriasDoTipo = useMemo(() => (categorias || []).filter((c) => c.tipo === (form.tipo === "jogo" ? "jogo" : "produto")), [categorias, form.tipo]);
    const generosConhecidos = useMemo(() => [...new Set((produtos || []).flatMap((p) => p.generos || []))].sort(), [produtos]);
    const compatConhecidas = useMemo(() => [...new Set((produtos || []).flatMap((p) => p.compatibilidade || []))].sort(), [produtos]);
    const marcas = useMemo(() => [...new Set((produtos || []).map((p) => p.marca).filter(Boolean))].sort(), [produtos]);

    const mudar = (parcial) => {
        setForm((f) => {
            const novo = { ...f, ...parcial };
            if ("nome" in parcial && !slugManual) novo.slug = paraSlug(parcial.nome);
            if ("tipo" in parcial && parcial.tipo !== f.tipo) novo.categoria_id = parcial.tipo === "jogo" ? (categorias?.find((c) => c.tipo === "jogo")?.id ?? "") : "";
            return novo;
        });
        setErros((e) => {
            const resto = { ...e };
            Object.keys(parcial).forEach((k) => delete resto[k]);
            return resto;
        });
    };
    const campo = (nome) => ({ value: form[nome], onChange: (e) => mudar({ [nome]: e.target.value }) });
    const guardarPrevia = (p) => {
        if (p?.previa) previas.current.push(p.previa);
        return p;
    };

    if (erroCarregar) return <p className="a-alerta">{erroCarregar}</p>;
    if (original === undefined || !categorias) return <Carregando linhas={10} />;

    const jogo = form.tipo === "jogo";
    const steamPadrao = (tamanho) => (jogo && form.app_id && /^\d+$/.test(form.app_id) ? `${CDN_STEAM}/${form.app_id}/${tamanho}` : null);
    const ilustracaoAntiga = !jogo && form.imagem_principal && !ehUrl(form.imagem_principal) ? `${import.meta.env.BASE_URL}acessorios/${form.imagem_principal}.svg` : null;

    async function salvar(e) {
        e.preventDefault();
        const encontrados = validar(form, produtos, id);
        setErros(encontrados);
        if (Object.keys(encontrados).length) {
            setErroGeral("Confira os campos destacados.");
            requestAnimationFrame(() => document.querySelector(".a-campo.com-erro input, .a-campo.com-erro select, .a-campo.com-erro textarea")?.focus());
            return;
        }
        setErroGeral("");
        const enviadas = [];
        try {
            // 1) imagens novas vão para o Storage
            setSalvando("Enviando imagens…");
            const pasta = `${jogo ? "jogos" : "produtos"}/${id || "novos"}`;
            const enviar = async (p) => {
                const url = await api.enviarImagem(p.arquivo, p.tipo, pasta);
                enviadas.push(url);
                return url;
            };
            const imagemPrincipal = pendentes.principal ? await enviar(pendentes.principal) : form.imagem_principal;
            const imagemCapa = jogo ? (pendentes.capa ? await enviar(pendentes.capa) : form.imagem_capa) : null;
            const galeria = [];
            for (const item of form.galeria) galeria.push(item.url || (await enviar(item.pendente)));

            // 2) salva o produto (o banco confere permissão e regras de preço de novo)
            setSalvando("Salvando…");
            const salvo = await api.salvarProduto({ ...paraBanco(form), imagem_principal: imagemPrincipal || null, imagem_capa: imagemCapa || null, galeria }, id);

            // 3) apaga do Storage as imagens antigas que ninguém mais usa
            if (original) {
                const antigas = [original.imagem_principal, original.imagem_capa, ...(original.galeria || [])];
                const atuais = new Set([salvo.imagem_principal, salvo.imagem_capa, ...(salvo.galeria || [])]);
                await api.apagarImagensOrfas(antigas.filter((u) => u && !atuais.has(u))).catch(() => {});
            }
            avisar(id ? `"${salvo.nome}" foi salvo.` : `"${salvo.nome}" foi cadastrado${salvo.status === "ativo" ? " e já está na loja" : ""}.`);
            await aposAlterar();
            setPendentes({ principal: null, capa: null });
            if (id) {
                setOriginal(salvo);
                setForm(paraFormulario(salvo));
            } else {
                navegar(`/admin/produtos/${salvo.id}`);
            }
        } catch (falha) {
            // se o produto não salvou, as imagens recém-enviadas não ficam sobrando
            if (enviadas.length) api.apagarImagensOrfas(enviadas).catch(() => {});
            setErroGeral(falha.message);
            avisar(falha.message, "erro");
        } finally {
            setSalvando("");
        }
    }

    async function apagar() {
        setSalvando("Apagando…");
        try {
            await api.removerProduto(id);
            await api.apagarImagensOrfas([original.imagem_principal, original.imagem_capa, ...(original.galeria || [])]).catch(() => {});
            avisar(`"${original.nome}" foi apagado.`);
            await aposAlterar();
            navegar("/admin/produtos");
        } catch (falha) {
            avisar(falha.message, "erro");
            setApagando(false);
        } finally {
            setSalvando("");
        }
    }

    const status = STATUS_PRODUTO[form.status];
    return (
        <form className="a-formulario" onSubmit={salvar} noValidate>
            <Cabecalho titulo={id ? form.nome || "Produto" : "Novo produto"} descricao={original ? `#${original.id} · criado em ${dataHora(original.criado_em)} · atualizado em ${dataHora(original.atualizado_em)}` : "Preencha os dados e salve. Publique quando estiver pronto."}>
                {original?.status === "ativo" && (
                    <a className="a-botao" href={`#/${original.tipo === "jogo" ? "jogo" : "produto"}/${original.id}`} target="_blank" rel="noreferrer">
                        <IconeExterno tamanho={16} /> Ver na loja
                    </a>
                )}
                <a className="a-botao" href="#/admin/produtos">
                    Voltar
                </a>
            </Cabecalho>

            {erroGeral && (
                <p className="a-alerta" role="alert">
                    {erroGeral}
                </p>
            )}

            <section className="a-cartao">
                <h2>Básico</h2>
                <div className="a-escolha-tipo" role="radiogroup" aria-label="Tipo de produto">
                    {[
                        ["jogo", "Jogo", "Plataformas, gênero, estúdio e lançamento"],
                        ["acessorio", "Acessório ou produto", "Marca, modelo, compatibilidade e estoque"],
                    ].map(([valor, rotulo, detalhe]) => (
                        <label key={valor} className={form.tipo === valor ? "ativo" : ""}>
                            <input type="radio" name="tipo" value={valor} checked={form.tipo === valor} onChange={() => mudar({ tipo: valor })} disabled={Boolean(id)} />
                            <strong>{rotulo}</strong>
                            <small>{detalhe}</small>
                        </label>
                    ))}
                </div>
                <div className="a-grade">
                    <Campo rotulo="Nome" erro={erros.nome} largura={8}>
                        {(i) => <input id={i} required maxLength={160} {...campo("nome")} />}
                    </Campo>
                    <Campo rotulo="Publicação" largura={4} dica={form.status === "ativo" ? "Aparece na loja." : "Não aparece na loja."}>
                        {(i) => (
                            <select id={i} {...campo("status")}>
                                {Object.entries(STATUS_PRODUTO).map(([valor, { rotulo }]) => (
                                    <option key={valor} value={valor}>
                                        {rotulo}
                                    </option>
                                ))}
                            </select>
                        )}
                    </Campo>
                    <Campo rotulo="Endereço na loja (slug)" erro={erros.slug} dica="Gerado pelo nome; edite se quiser." largura={6}>
                        {(i) => (
                            <input
                                id={i}
                                value={form.slug}
                                onChange={(e) => {
                                    setSlugManual(true);
                                    // deixa digitar o hífen do fim; a validação confere o formato final
                                    mudar({ slug: e.target.value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-") });
                                }}
                            />
                        )}
                    </Campo>
                    <Campo rotulo="Categoria" erro={erros.categoria_id} largura={6}>
                        {(i) => (
                            <select id={i} {...campo("categoria_id")}>
                                <option value="">Escolha…</option>
                                {categoriasDoTipo.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nome}
                                        {!c.ativa ? " (inativa)" : ""}
                                    </option>
                                ))}
                            </select>
                        )}
                    </Campo>
                    <Campo rotulo="Descrição curta" dica="Uma frase para listas e buscadores (opcional)." largura={12}>
                        {(i) => <input id={i} maxLength={300} {...campo("descricao_curta")} />}
                    </Campo>
                    <Campo rotulo="Descrição completa" largura={12}>
                        {(i) => <textarea id={i} rows={5} maxLength={5000} {...campo("descricao")} />}
                    </Campo>
                </div>
            </section>

            <section className="a-cartao">
                <h2>Preço e promoção</h2>
                <div className="a-grade">
                    <Campo rotulo="Preço original (R$)" erro={erros.preco} largura={4}>
                        {(i) => <input id={i} inputMode="decimal" placeholder="0,00" {...campo("preco")} />}
                    </Campo>
                </div>
                <CamposPromocao valores={form} aoMudar={mudar} erros={erros} />
            </section>

            <section className="a-cartao">
                <h2>Imagens</h2>
                <div className="a-imagens">
                    <CampoImagem
                        rotulo={jogo ? "Imagem do card (horizontal)" : "Imagem principal"}
                        dica={jogo ? "Aparece nos cards, listas e carrinho. Ideal 920 x 430." : "Aparece nos cards e na página do produto. Ideal 1200 x 900."}
                        atual={ehUrl(form.imagem_principal) ? form.imagem_principal : ilustracaoAntiga}
                        atualPadrao={steamPadrao("header.jpg")}
                        pendente={pendentes.principal}
                        proporcao={jogo ? "460 / 215" : "4 / 3"}
                        aoEscolher={(p) => setPendentes((s) => ({ ...s, principal: guardarPrevia(p) }))}
                        aoDesfazer={() => setPendentes((s) => ({ ...s, principal: null }))}
                        aoRemover={() => mudar({ imagem_principal: null })}
                    />
                    {jogo && (
                        <CampoImagem
                            rotulo="Capa vertical"
                            dica="Usada no banner e nas vitrines de capas. Ideal 600 x 900."
                            atual={ehUrl(form.imagem_capa) ? form.imagem_capa : null}
                            atualPadrao={steamPadrao("library_600x900.jpg")}
                            pendente={pendentes.capa}
                            proporcao="2 / 3"
                            aoEscolher={(p) => setPendentes((s) => ({ ...s, capa: guardarPrevia(p) }))}
                            aoDesfazer={() => setPendentes((s) => ({ ...s, capa: null }))}
                            aoRemover={() => mudar({ imagem_capa: null })}
                        />
                    )}
                </div>
                <CampoGaleria
                    itens={form.galeria}
                    aoMudar={(galeria) => {
                        galeria.forEach((g) => g.pendente && guardarPrevia(g.pendente));
                        mudar({ galeria });
                    }}
                />
                {jogo && form.app_id && (
                    <p className="a-dica">Sem imagem própria, o jogo usa as imagens oficiais da Steam (app {form.app_id}). Para substituir, envie arquivos seus ou de uso autorizado.</p>
                )}
            </section>

            {jogo ? (
                <section className="a-cartao">
                    <h2>Dados do jogo</h2>
                    <div className="a-grade">
                        <Campo rotulo="Plataformas" erro={erros.plataformas} dica="Marque os consoles ou digite outra plataforma e aperte Enter." largura={12}>
                            {(i) => (
                                <>
                                    <div className="a-marcadores">
                                        {CONSOLES.map((c) => (
                                            <label key={c} className={form.plataformas.includes(c) ? "ativo" : ""}>
                                                <input type="checkbox" checked={form.plataformas.includes(c)} onChange={(e) => mudar({ plataformas: e.target.checked ? [...form.plataformas, c] : form.plataformas.filter((x) => x !== c) })} />
                                                {c}
                                            </label>
                                        ))}
                                    </div>
                                    <Etiquetas id={i} valores={form.plataformas.filter((p) => !CONSOLES.includes(p))} aoMudar={(outras) => mudar({ plataformas: [...form.plataformas.filter((p) => CONSOLES.includes(p)), ...outras] })} placeholder="Outra plataforma" />
                                </>
                            )}
                        </Campo>
                        <Campo rotulo="Gêneros" largura={12} dica="Enter para adicionar.">
                            {(i) => <Etiquetas id={i} valores={form.generos} aoMudar={(generos) => mudar({ generos })} sugestoes={generosConhecidos} placeholder="Ação, RPG…" />}
                        </Campo>
                        <Campo rotulo="Desenvolvedora ou publicadora" largura={6}>
                            {(i) => <input id={i} {...campo("desenvolvedora")} />}
                        </Campo>
                        <Campo rotulo="Ano de lançamento" erro={erros.lancamento} largura={3}>
                            {(i) => <input id={i} inputMode="numeric" maxLength={4} {...campo("lancamento")} />}
                        </Campo>
                        <Campo rotulo="Formato" largura={3}>
                            {(i) => (
                                <select id={i} {...campo("formato")}>
                                    <option value="midia_fisica">Mídia física</option>
                                    <option value="digital">Digital</option>
                                    <option value="outro">Outro</option>
                                </select>
                            )}
                        </Campo>
                        <Campo rotulo="Nota (0 a 10)" erro={erros.nota} largura={3}>
                            {(i) => <input id={i} inputMode="decimal" {...campo("nota")} />}
                        </Campo>
                        <Campo rotulo="Código na Steam (opcional)" erro={erros.app_id} dica="Puxa imagens e trailer oficiais." largura={3}>
                            {(i) => <input id={i} inputMode="numeric" {...campo("app_id")} />}
                        </Campo>
                        <Campo rotulo="Compatibilidade e requisitos" largura={12} dica="Ex.: requer PlayStation Plus para jogar online (opcional).">
                            {(i) => <textarea id={i} rows={2} {...campo("requisitos")} />}
                        </Campo>
                    </div>
                    <Interruptor marcado={form.destaque} aoMudar={(destaque) => mudar({ destaque })} rotulo="Destaque na página inicial" descricao="Entra no carrossel de destaques da loja." />
                </section>
            ) : (
                <section className="a-cartao">
                    <h2>Dados do produto</h2>
                    <div className="a-grade">
                        <Campo rotulo="Marca" largura={4}>
                            {(i) => (
                                <>
                                    <input id={i} list={`${i}-marcas`} {...campo("marca")} />
                                    <datalist id={`${i}-marcas`}>
                                        {marcas.map((m) => (
                                            <option key={m} value={m} />
                                        ))}
                                    </datalist>
                                </>
                            )}
                        </Campo>
                        <Campo rotulo="Modelo" largura={4}>
                            {(i) => <input id={i} {...campo("modelo")} />}
                        </Campo>
                        <Campo rotulo="Nota (0 a 10)" erro={erros.nota} largura={2}>
                            {(i) => <input id={i} inputMode="decimal" {...campo("nota")} />}
                        </Campo>
                        <Campo rotulo="Avaliações" largura={2}>
                            {(i) => <input id={i} inputMode="numeric" {...campo("avaliacoes")} />}
                        </Campo>
                        <Campo rotulo="Compatível com" largura={12} dica="Plataformas ou aparelhos. Enter para adicionar.">
                            {(i) => <Etiquetas id={i} valores={form.compatibilidade} aoMudar={(compatibilidade) => mudar({ compatibilidade })} sugestoes={compatConhecidas} placeholder="PS5, Android…" />}
                        </Campo>
                        <Campo rotulo="Variações" largura={12} dica="Cores ou modelos, se houver. Enter para adicionar.">
                            {(i) => <Etiquetas id={i} valores={form.variacoes} aoMudar={(variacoes) => mudar({ variacoes })} placeholder="Preto, Branco…" />}
                        </Campo>
                        <Campo rotulo="Especificações" largura={12} dica="Uma por linha.">
                            {(i) => <textarea id={i} rows={5} {...campo("especificacoes")} />}
                        </Campo>
                    </div>
                    <Interruptor marcado={form.controla_estoque} aoMudar={(controla_estoque) => mudar({ controla_estoque })} rotulo="Controlar estoque" descricao="Baixa a cada reserva e mostra “Esgotado” quando zerar." />
                    {form.controla_estoque && (
                        <div className="a-grade">
                            <Campo rotulo="Quantidade em estoque" erro={erros.estoque} largura={4}>
                                {(i) => <input id={i} inputMode="numeric" {...campo("estoque")} />}
                            </Campo>
                            <Campo rotulo="Avisar quando chegar a" erro={erros.estoque_minimo} largura={4}>
                                {(i) => <input id={i} inputMode="numeric" {...campo("estoque_minimo")} />}
                            </Campo>
                        </div>
                    )}
                </section>
            )}

            {id && (
                <section className="a-cartao a-perigo">
                    <h2>Apagar produto</h2>
                    <p className="a-texto">
                        Prefira <strong>arquivar</strong> (mude a publicação para “Arquivado”): o produto sai da loja e o histórico continua. Apagar é definitivo e não funciona se ele já aparece em reservas.
                    </p>
                    <button type="button" className="a-botao perigo" onClick={() => setApagando(true)}>
                        <IconeLixeira tamanho={16} /> Apagar definitivamente
                    </button>
                </section>
            )}

            <div className="a-barra-salvar">
                <span className="a-texto-apagado">
                    {salvando || (
                        <>
                            Publicação: <strong>{status.rotulo}</strong>
                        </>
                    )}
                </span>
                <a className="a-botao" href="#/admin/produtos">
                    Cancelar
                </a>
                <button type="submit" className="a-botao primario" disabled={Boolean(salvando)}>
                    {salvando || (id ? "Salvar alterações" : "Cadastrar produto")}
                </button>
            </div>

            {apagando && (
                <Confirmacao
                    titulo="Apagar definitivamente?"
                    texto={`"${original.nome}" e as imagens enviadas só para ele serão apagados. Isso não pode ser desfeito.`}
                    rotulo="Apagar"
                    perigo
                    ocupado={Boolean(salvando)}
                    aoConfirmar={apagar}
                    aoCancelar={() => setApagando(false)}
                />
            )}
        </form>
    );
}
