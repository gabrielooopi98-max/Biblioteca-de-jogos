// Gera supabase/seed.sql com o catálogo atual (src/dados/jogos.js e src/dados/produtos.js).
// Preserva os ids e as imagens de cada item. Usa "on conflict do nothing": rodar de novo não
// sobrescreve o que já foi editado pelo painel.
// Uso: node scripts/gerar-seed.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const { default: jogos } = await import(new URL("../src/dados/jogos.js", import.meta.url));
const { default: acessorios, CATEGORIAS_ACESSORIOS, MARCA_ACESSORIOS } = await import(new URL("../src/dados/produtos.js", import.meta.url));

const texto = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const numero = (v) => (v == null ? "null" : String(v));
const lista = (arr) => (arr && arr.length ? `array[${arr.map(texto).join(", ")}]::text[]` : "'{}'::text[]");
const json = (v) => (v == null ? "null" : `${texto(JSON.stringify(v))}::jsonb`);
const promocional = (item) => (item.desconto > 0 ? Math.round(item.preco * (100 - item.desconto)) / 100 : null);

const usados = new Set();
function slug(nome, id) {
    let base = nome
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70)
        .replace(/-+$/, "");
    if (!base) base = `produto-${id}`;
    let final = base;
    for (let n = 2; usados.has(final); n++) final = `${base}-${n}`;
    usados.add(final);
    return final;
}

const linhas = [];
linhas.push("-- Catálogo inicial da Universal Games (gerado por scripts/gerar-seed.mjs). Não sobrescreve edições do painel.");
linhas.push("begin;");

// categorias: a dos jogos e os departamentos dos produtos, na ordem da loja
const categorias = [{ id: "jogos", nome: "Jogos", descricao: "Jogos para PlayStation e Xbox", tipo: "jogo" }, ...CATEGORIAS_ACESSORIOS.map((c) => ({ ...c, tipo: "produto" }))];
linhas.push("insert into public.categorias (id, nome, descricao, tipo, ordem) values");
linhas.push(categorias.map((c, i) => `  (${texto(c.id)}, ${texto(c.nome)}, ${texto(c.descricao)}, ${texto(c.tipo)}, ${i})`).join(",\n") + "\non conflict (id) do nothing;");

linhas.push("insert into public.cupons (codigo, percentual, descricao) values ('BEMVINDO10', 10, '10% na primeira compra'), ('GAMER15', 15, '15% em todo o carrinho') on conflict (codigo) do nothing;");

const COLUNAS = "id, slug, tipo, categoria_id, nome, descricao, status, preco, preco_promocional, promocao_ativa, imagem_principal, app_id, plataformas, generos, desenvolvedora, lancamento, formato, nota, trailer, capturas, fundo, imagens, destaque, marca, compatibilidade, especificacoes, avaliacoes";

const valoresJogo = (j) =>
    [
        numero(j.id), texto(slug(j.nome, j.id)), "'jogo'", "'jogos'", texto(j.nome), texto(j.descricao), "'ativo'",
        numero(j.preco), numero(promocional(j)), j.desconto > 0 ? "true" : "false", "null",
        numero(j.appId), lista(j.plataformas), lista(j.generos), texto(j.desenvolvedora), numero(j.lancamento), "'midia_fisica'", numero(j.nota),
        json(j.trailer), lista(j.capturas), texto(j.fundo), json(j.imagens), j.destaque ? "true" : "false",
        "null", "'{}'::text[]", "'{}'::text[]", "null",
    ].join(", ");

const valoresProduto = (a) =>
    [
        numero(a.id), texto(slug(a.nome, a.id)), "'acessorio'", texto(a.categoria), texto(a.nome), texto(a.descricao), "'ativo'",
        numero(a.preco), numero(promocional(a)), a.desconto > 0 ? "true" : "false", texto(a.ilustracao),
        "null", "'{}'::text[]", "'{}'::text[]", "null", "null", "null", numero(a.nota),
        "null", "'{}'::text[]", "null", "null", "false",
        texto(MARCA_ACESSORIOS), lista(a.compatibilidade), lista(a.especificacoes), numero(a.avaliacoes),
    ].join(", ");

linhas.push(`insert into public.produtos (${COLUNAS}) values`);
linhas.push([...jogos.map(valoresJogo), ...acessorios.map(valoresProduto)].map((v) => `  (${v})`).join(",\n") + "\non conflict (id) do nothing;");

// novos produtos criados pelo painel começam depois do maior id atual
const maior = Math.max(...jogos.map((j) => j.id), ...acessorios.map((a) => a.id));
linhas.push(`select setval('public.produtos_id_seq', greatest(${maior + 1}, (select coalesce(max(id), 0) + 1 from public.produtos)), false);`);
linhas.push("commit;");

writeFileSync(`${raiz}supabase/seed.sql`, linhas.join("\n") + "\n");
console.log(`seed.sql: ${categorias.length} categorias, ${jogos.length} jogos, ${acessorios.length} produtos (próximo id ${maior + 1})`);
