import { createClient } from "@supabase/supabase-js";

// Conexão com o Supabase (banco, login do painel e imagens).
// A URL e a chave "anon" são públicas por natureza: quem protege os dados são as regras do banco
// (Row Level Security, em supabase/migrations). Elas vêm do arquivo .env.local (não vai para o Git).
const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && chave ? createClient(url, chave, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "ug:sessao-admin" } }) : null;

export const BUCKET_IMAGENS = "produtos";

// Mensagens do banco e da rede em português claro.
export function mensagemDeErro(erro) {
    const texto = erro?.message || String(erro || "");
    if (/Failed to fetch|NetworkError|network/i.test(texto)) return "Sem conexão com o servidor. Confira a internet e tente de novo.";
    if (/Invalid login credentials/i.test(texto)) return "E-mail ou senha incorretos.";
    if (/Email not confirmed/i.test(texto)) return "Confirme o e-mail desta conta antes de entrar.";
    if (/JWT expired|invalid JWT|session.*(expired|missing)/i.test(texto)) return "Sua sessão expirou. Entre de novo.";
    if (/row-level security|permission denied|42501|restrito/i.test(texto)) return "Você não tem permissão para fazer isso.";
    if (/produtos_slug_key|duplicate key.*slug/i.test(texto)) return "Já existe um produto com esse endereço (slug). Escolha outro.";
    if (/promocao_abaixo_do_preco/.test(texto)) return "O preço promocional precisa ser menor que o preço original.";
    if (/promocao_periodo/.test(texto)) return "O fim da promoção precisa ser depois do início.";
    if (/promocao_com_preco/.test(texto)) return "Informe o preço promocional para ativar a promoção.";
    if (/estoque_quando_controla/.test(texto)) return "Informe a quantidade em estoque.";
    if (/violates foreign key.*reserva_itens/i.test(texto)) return "Este produto já aparece em reservas: arquive em vez de apagar.";
    if (/violates check constraint/i.test(texto)) return "Algum valor está fora do permitido. Confira os campos.";
    if (/mime type|invalid_mime_type/i.test(texto)) return "Formato de imagem não aceito. Use JPEG, PNG ou WebP.";
    if (/exceeded the maximum allowed size|Payload too large|413/i.test(texto)) return "A imagem passou do limite de 5 MB.";
    return texto || "Algo deu errado. Tente de novo.";
}
