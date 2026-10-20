// Contas de clientes da loja (Supabase Auth). A sessão do cliente fica separada da do painel
// (chaves diferentes no navegador), então entrar como cliente nunca mexe no login do administrador.
// Este arquivo é carregado sob demanda pelo useConta (hooks.js).
import { createClient } from "@supabase/supabase-js";
import { mensagemDeErro } from "./supabase.js";

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY;

// PKCE: o link do e-mail volta com ?code=... e só vira sessão neste navegador
export const clientes = url && chave ? createClient(url, chave, { auth: { storageKey: "ug:sessao-cliente", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" } }) : null;

// endereço do site sem o "#/..." (o Supabase acrescenta ?code=... para confirmar o e-mail ou trocar a senha)
const voltarPara = (extra = "") => `${window.location.origin}${import.meta.env.BASE_URL}${extra}`;

function resultado({ data, error }) {
    if (error) throw new Error(traduzir(error));
    return data;
}

function traduzir(erro) {
    const texto = erro?.message || "";
    if (/Email not confirmed/i.test(texto)) return "Confirme seu e-mail antes de entrar. Procure a mensagem da Universal Games na caixa de entrada (e no spam).";
    if (/Password should be|weak password|pwned|leaked/i.test(texto)) return "Essa senha é fraca ou já apareceu em vazamentos. Escolha outra.";
    if (/rate limit|too many|security purposes/i.test(texto)) return "Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.";
    if (/Signups not allowed|signup.*disabled/i.test(texto)) return "O cadastro de novas contas está desligado no momento.";
    if (/New password should be different/i.test(texto)) return "A nova senha precisa ser diferente da atual.";
    if (/Auth session missing|session.*expired|invalid.*(jwt|token|flow)|code verifier|both auth code/i.test(texto)) return "O link expirou ou foi aberto em outro navegador. Peça um novo ou entre com sua senha.";
    if (/User already registered/i.test(texto)) return "Confira seu e-mail para continuar.";
    return mensagemDeErro(erro);
}

export const sessaoAtual = async () => resultado(await clientes.auth.getSession()).session;
export const aoMudar = (fn) => clientes.auth.onAuthStateChange(fn).data.subscription;

export async function entrar(email, senha) {
    return resultado(await clientes.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha })).session;
}

// Por segurança o Supabase não conta se o e-mail já tem conta: a resposta é a mesma nos dois casos.
export async function criarConta({ nome, email, telefone, senha }) {
    const dados = resultado(
        await clientes.auth.signUp({
            email: email.trim().toLowerCase(),
            password: senha,
            options: { emailRedirectTo: voltarPara(), data: { nome: nome.trim(), telefone: telefone.trim() } },
        }),
    );
    return { precisaConfirmar: !dados.session };
}

export const reenviarConfirmacao = async (email) => resultado(await clientes.auth.resend({ type: "signup", email: email.trim().toLowerCase(), options: { emailRedirectTo: voltarPara() } }));
export const pedirNovaSenha = async (email) => resultado(await clientes.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: voltarPara("?redefinir=1") }));
export const definirSenha = async (senha) => resultado(await clientes.auth.updateUser({ password: senha }));
export const salvarDados = async ({ nome, telefone }) => resultado(await clientes.auth.updateUser({ data: { nome: nome.trim(), telefone: telefone.trim() } })).user;

// troca de senha logado: confere a senha atual antes (quem pegar o celular desbloqueado não troca a senha)
export async function trocarSenha(email, atual, nova) {
    const { error } = await clientes.auth.signInWithPassword({ email, password: atual });
    if (error) throw new Error("A senha atual não confere.");
    return definirSenha(nova);
}

export const sair = (todos = false) => clientes.auth.signOut({ scope: todos ? "global" : "local" });
export const minhasReservas = async () => resultado(await clientes.rpc("minhas_reservas"));
// só para mostrar o atalho do painel; o painel confere de novo no próprio login
export const ehAdministrador = async () => Boolean(resultado(await clientes.rpc("eh_admin")));
