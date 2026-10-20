// Regras de senha e proteção contra tentativas repetidas no login.
// O Supabase também limita tentativas no servidor; aqui é a primeira barreira, no navegador.

const COMUNS = new Set([
    "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000", "12341234", "senha123", "senha1234", "password", "password1",
    "qwerty123", "qwertyuiop", "abc12345", "abcd1234", "iloveyou", "admin123", "mudar123", "brasil123", "flamengo", "corinthians",
    "palmeiras", "gremio123", "minecraft", "fortnite", "playstation", "xbox360", "universal", "universalgames",
]);

// Cada regra: [mensagem, teste]
export function regrasDaSenha(senha, { email = "", nome = "" } = {}) {
    const usuario = email.split("@")[0].toLowerCase();
    const primeiroNome = nome.trim().split(/\s+/)[0]?.toLowerCase() || "";
    const minuscula = senha.toLowerCase();
    return [
        ["Pelo menos 8 caracteres", senha.length >= 8],
        ["Letras maiúsculas e minúsculas", /[a-z]/.test(senha) && /[A-Z]/.test(senha)],
        ["Pelo menos um número", /\d/.test(senha)],
        [
            "Não é uma senha comum nem usa seu nome ou e-mail",
            senha.length > 0 && !COMUNS.has(minuscula.replace(/[^a-z0-9]/g, "")) && !(usuario.length >= 4 && minuscula.includes(usuario)) && !(primeiroNome.length >= 4 && minuscula.includes(primeiroNome)) && !/^(.)\1+$/.test(senha),
        ],
    ];
}

export const senhaValida = (senha, contexto) => regrasDaSenha(senha, contexto).every(([, ok]) => ok);

// 0 a 4, para a barrinha de força
export function forcaDaSenha(senha, contexto) {
    if (!senha) return 0;
    const atendidas = regrasDaSenha(senha, contexto).filter(([, ok]) => ok).length;
    // enquanto falta alguma regra: muito fraca ou fraca; com todas: razoável, e sobe com tamanho e símbolos
    if (atendidas < 4) return atendidas >= 3 ? 1 : 0;
    return Math.min(4, 2 + (senha.length >= 12 ? 1 : 0) + (/[^A-Za-z0-9]/.test(senha) ? 1 : 0));
}
export const ROTULO_FORCA = ["Muito fraca", "Fraca", "Razoável", "Forte", "Muito forte"];

// --- Bloqueio progressivo depois de erros seguidos (por navegador) ---
const LIVRES = 5;

function ler(chave) {
    try {
        return JSON.parse(localStorage.getItem(chave)) || { erros: 0, ate: 0 };
    } catch {
        return { erros: 0, ate: 0 };
    }
}

// segundos que ainda faltam de espera (0 = pode tentar)
export function esperaRestante(chave) {
    return Math.max(0, Math.ceil((ler(chave).ate - Date.now()) / 1000));
}

export function registrarErro(chave) {
    const atual = ler(chave);
    const erros = atual.erros + 1;
    // 5 erros livres; depois 30 s, 60 s, 120 s… até 15 minutos
    const espera = erros >= LIVRES ? Math.min(30 * 2 ** (erros - LIVRES), 900) : 0;
    try {
        localStorage.setItem(chave, JSON.stringify({ erros, ate: Date.now() + espera * 1000 }));
    } catch {
        /* navegador sem armazenamento: o limite do servidor continua valendo */
    }
    return espera;
}

export function limparErros(chave) {
    try {
        localStorage.removeItem(chave);
    } catch {
        /* nada a limpar */
    }
}
