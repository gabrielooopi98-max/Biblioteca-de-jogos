function Icone({ children, tamanho = 20, preenchido = false, ...props }) {
    return (
        <svg
            width={tamanho}
            height={tamanho}
            viewBox="0 0 24 24"
            fill={preenchido ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            {children}
        </svg>
    );
}

export const IconeCarrinho = (p) => (
    <Icone {...p}>
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="18" cy="20" r="1.4" />
        <path d="M2.5 3.5h2.6l2.4 11.2a1.8 1.8 0 0 0 1.8 1.4h8.5a1.8 1.8 0 0 0 1.8-1.4L21 7.5H6" />
    </Icone>
);

export const IconeCoracao = (p) => (
    <Icone {...p}>
        <path d="M19.5 12.6 12 20l-7.5-7.4A4.9 4.9 0 0 1 12 6.1a4.9 4.9 0 0 1 7.5 6.5Z" />
    </Icone>
);

export const IconeBusca = (p) => (
    <Icone {...p}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
    </Icone>
);

export const IconeFechar = (p) => (
    <Icone {...p}>
        <path d="M18 6 6 18M6 6l12 12" />
    </Icone>
);

export const IconeSetaEsquerda = (p) => (
    <Icone {...p}>
        <path d="m15 18-6-6 6-6" />
    </Icone>
);

export const IconeSetaDireita = (p) => (
    <Icone {...p}>
        <path d="m9 18 6-6-6-6" />
    </Icone>
);

export const IconePlay = (p) => (
    <Icone {...p} preenchido>
        <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
    </Icone>
);

export const IconeSom = (p) => (
    <Icone {...p}>
        <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5Z" />
        <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </Icone>
);

export const IconeMudo = (p) => (
    <Icone {...p}>
        <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5Z" />
        <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </Icone>
);

export const IconeFone = (p) => (
    <Icone {...p}>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <rect x="3" y="14" width="4.5" height="6.5" rx="1.5" />
        <rect x="16.5" y="14" width="4.5" height="6.5" rx="1.5" />
    </Icone>
);

export const IconeCaminhao = (p) => (
    <Icone {...p}>
        <path d="M2.5 6.5h11v9h-11z" />
        <path d="M13.5 9.5h4l3 3v3h-7" />
        <circle cx="7" cy="17.5" r="1.8" />
        <circle cx="17" cy="17.5" r="1.8" />
    </Icone>
);

export const IconeSeta = (p) => (
    <Icone {...p}>
        <path d="M5 12h14M13 6l6 6-6 6" />
    </Icone>
);

export const IconeEstrela = (p) => (
    <Icone {...p}>
        <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
    </Icone>
);

export const IconeLixeira = (p) => (
    <Icone {...p}>
        <path d="M4 7h16M9 7V4.5h6V7M18 7l-.8 12.2a1.5 1.5 0 0 1-1.5 1.3H8.3a1.5 1.5 0 0 1-1.5-1.3L6 7M10 11v6M14 11v6" />
    </Icone>
);

export const IconeCheck = (p) => (
    <Icone {...p}>
        <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icone>
);

export const IconeRaio = (p) => (
    <Icone {...p}>
        <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />
    </Icone>
);

export const IconeEscudo = (p) => (
    <Icone {...p}>
        <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6Z" />
        <path d="m9 12 2 2 4-4" />
    </Icone>
);

export const IconeSuporte = (p) => (
    <Icone {...p}>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <rect x="3" y="13" width="4" height="6" rx="1.5" />
        <rect x="17" y="13" width="4" height="6" rx="1.5" />
        <path d="M19 19a3 3 0 0 1-3 2.5h-2.5" />
    </Icone>
);

export const IconeCartao = (p) => (
    <Icone {...p}>
        <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
        <path d="M2.5 10h19M6.5 15h3" />
    </Icone>
);

export const IconePix = (p) => (
    <Icone {...p}>
        <path d="m12 2.8 4 4-4 4-4-4ZM12 13.2l4 4-4 4-4-4ZM2.8 12l4-4 4 4-4 4ZM13.2 12l4-4 4 4-4 4Z" />
    </Icone>
);

export const IconeBoleto = (p) => (
    <Icone {...p}>
        <path d="M4 5v14M7 5v14M10 5v14M14 5v14M16 5v14M20 5v14" />
    </Icone>
);

export const IconeFiltro = (p) => (
    <Icone {...p}>
        <path d="M4 6h16M7 12h10M10 18h4" />
    </Icone>
);

export const IconeRelogio = (p) => (
    <Icone {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
    </Icone>
);

export const IconeEtiqueta = (p) => (
    <Icone {...p}>
        <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9Z" />
        <circle cx="7.5" cy="7.5" r="1.3" />
    </Icone>
);

export const IconePresente = (p) => (
    <Icone {...p}>
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M5 12v8h14v-8M12 8v12M12 8S10.5 3.5 8 4.2C6 4.8 6.8 8 12 8ZM12 8s1.5-4.5 4-3.8c2 .6 1.2 3.8-4 3.8Z" />
    </Icone>
);

export const IconeCadeado = (p) => (
    <Icone {...p}>
        <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
        <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </Icone>
);

export const IconeEmail = (p) => (
    <Icone {...p}>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </Icone>
);

export const IconeControle = (p) => (
    <Icone {...p}>
        <path d="M7.5 7h9a5 5 0 0 1 4.8 6.4l-1 3.5a2.6 2.6 0 0 1-4.4 1.1L14 16h-4l-1.9 2a2.6 2.6 0 0 1-4.4-1.1l-1-3.5A5 5 0 0 1 7.5 7Z" />
        <path d="M8 10v3M6.5 11.5h3M15.5 11h.01M17.5 13h.01" />
    </Icone>
);

export const IconeMonitor = (p) => (
    <Icone {...p}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
    </Icone>
);

export const IconeCalendario = (p) => (
    <Icone {...p}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Icone>
);

export const IconeCodigo = (p) => (
    <Icone {...p}>
        <path d="M15 5.5 20.5 11 15 16.5M9 5.5 3.5 11 9 16.5" />
    </Icone>
);

export const IconeMenu = (p) => (
    <Icone {...p}>
        <path d="M4 7h16M4 12h16M4 17h16" />
    </Icone>
);

export const IconeCopiar = (p) => (
    <Icone {...p}>
        <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
        <path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
    </Icone>
);

export const IconeBiblioteca = (p) => (
    <Icone {...p}>
        <path d="M4 4h3v16H4zM9 4h3v16H9zM14.5 4.6l2.9-.8 3.9 15.4-2.9.8z" />
    </Icone>
);

export const IconeRecibo = (p) => (
    <Icone {...p}>
        <path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
    </Icone>
);

export const IconeComparar = (p) => (
    <Icone {...p}>
        <rect x="3" y="4" width="7" height="16" rx="1.5" />
        <rect x="14" y="4" width="7" height="16" rx="1.5" />
    </Icone>
);

export const IconeSol = (p) => (
    <Icone {...p}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icone>
);

export const IconeLua = (p) => (
    <Icone {...p}>
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </Icone>
);

export const IconeSino = (p) => (
    <Icone {...p}>
        <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9ZM10 20a2 2 0 0 0 4 0" />
    </Icone>
);

export const IconeOlho = (p) => (
    <Icone {...p}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
    </Icone>
);

export const IconeOlhoFechado = (p) => (
    <Icone {...p}>
        <path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Icone>
);

export const IconeGrade = (p) => (
    <Icone {...p}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </Icone>
);

export const IconeLista = (p) => (
    <Icone {...p}>
        <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
    </Icone>
);

export const IconeCasa = (p) => (
    <Icone {...p}>
        <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z" />
    </Icone>
);

export const IconeBussola = (p) => (
    <Icone {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </Icone>
);

export const IconeDownload = (p) => (
    <Icone {...p}>
        <path d="M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15" />
    </Icone>
);

export const IconeDesfazer = (p) => (
    <Icone {...p}>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </Icone>
);

export const IconeMais = (p) => (
    <Icone {...p}>
        <path d="M12 5v14M5 12h14" />
    </Icone>
);

// Loja física: fachada com toldo (retirada no balcão)
export const IconeLoja = (p) => (
    <Icone {...p}>
        <path d="M3.5 9.5 5 4.5h14l1.5 5" />
        <path d="M3.5 9.5a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0" />
        <path d="M5 12.2v7.3h14v-7.3" />
        <path d="M10 19.5V15h4v4.5" />
    </Icone>
);

// Marca: o selo redondo da loja (public/logo-universal-games.jpg). O nome vem ao lado, em texto.
const LOGO = `${import.meta.env.BASE_URL}logo-universal-games.jpg`;

export function LogoMarca({ tamanho = 38 }) {
    return <img src={LOGO} width={tamanho} height={tamanho} alt="" aria-hidden="true" className="logo-marca" decoding="async" />;
}
