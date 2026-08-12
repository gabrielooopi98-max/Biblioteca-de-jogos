const jogos = [
    {
        id: 2,
        nome: "The Witcher 3: Wild Hunt",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox Series X/S, Xbox One, Nintendo Switch",
        nota: 9.5,
        preco: 79.99,
        desconto: 30
    },
    {
        id: 3,
        nome: "Cyberpunk 2077",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "RPG, Ação, Aventura, Mundo Aberto, Futurista",
        nota: 8.5,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 4,
        nome: "Batman:Arkhan Knight",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/208650/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Super-herói",
        nota: 8.0,
        preco: 49.99,
        desconto: 30
    },
    {
        id: 5,
        nome: "Red Dead Redemption 2",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Faroeste",
        nota: 9.0,
        preco: 149.99,
        desconto: 30
    },
    {
        id: 6,
        nome: "Grand Theft Auto V",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/3240220/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox Series X/S, Xbox One",
        genero: "Ação, Aventura, Mundo Aberto, Crime",
        nota: 9.0,
        preco: 99.99,
        desconto: 30
    },
    {
        id: 7,
        nome: "The Elder Scrolls V: Skyrim",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/489830/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S, Nintendo Switch",
        genero: "RPG, Ação, Aventura, Fantasia, Mundo Aberto",
        nota: 9.0,
        preco: 59.99,
        desconto: 30
    },
    {
        id: 8,
        nome: "Assassin's Creed Valhalla",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/2208920/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, História, Fantasia",
        nota: 8.5,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 9,
        nome: "Spider-Man: Miles Morales",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/1817190/header.jpg",
        plataforma: "PC, PS4, PS5",
        genero: "Ação, Aventura, Super-herói, Mundo Aberto",
        nota: 8.5,
        preco: 249.99,
        desconto: 30
    },
    {
        id: 11,
        nome: "Death Stranding",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/1850570/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Futurista, Fantasia",
        nota: 8.0,
        preco: 99.99,
        desconto: 30
    },
    {
        id: 12,
        nome: "Subnautica",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/264710/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox Series X/S, Xbox One",
        genero: "Ação, Aventura, Mundo Aberto, Sobrevivência, Fantasia",
        nota: 8.5,
        preco: 59.99,
        desconto: 30
    },
    {
        id: 14,
        nome: "Dark Souls III",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/374320/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox Series X/S, Xbox One",
        genero: "RPG, Ação, Aventura, Fantasia, Mundo Aberto",
        nota: 9.0,
        preco: 79.99,
        desconto: 30
    },
    {
        id: 15,
        nome: "Sekiro: Shadows Die Twice",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/814380/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox Series X/S Xbox One",
        genero: "Ação, Aventura, Mundo Aberto, Fantasia, História",
        nota: 9.0,
        preco: 99.99,
        desconto: 30
    },
    {
        id: 16,
        nome: "Resident Evil Village",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/1196590/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Terror, Fantasia",
        nota: 6.5,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 17,
        nome: "Far Cry 5",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/552520/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox Series X/S, Xbox One",
        genero: "Ação, Aventura, Mundo Aberto, Fantasia, História",
        nota: 8.0,
        preco: 79.99,
        desconto: 30
    },
    {
        id: 18,
        nome: "Dying Light",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/239140/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox Series X/S, Xbox One, Nintendo Switch",
        genero: "Ação, Aventura, Mundo Aberto, Sobrevivência, Fantasia",
        nota: 8.0,
        preco: 99.99,
        desconto: 30
    },
    {
        id: 21,
        nome: "Dark Souls II",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/335300/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox Series X/S, Xbox One",
        genero: "RPG, Ação, Aventura, Fantasia, Mundo Aberto",
        nota: 7.0,
        preco: 79.99,
        desconto: 30
    },
    {
        id: 22,
        nome: "CupHead",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/268910/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One Xbox Series X/S",
        genero: "RPG, Ação, Aventura, Fantasia, Mundo Aberto",
        nota: 9.0,
        preco: 99.99,
        desconto: 30
    },
    {
        id: 23,
        nome: "Dark Souls Remastered",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/570940/header.jpg",
        plataforma: "PC, PS4, Xbox Series X/S, Xbox One, Nintendo Switch",
        genero: "RPG, Ação, Aventura, Fantasia, Mundo Aberto",
        nota: 8.5,
        preco: 79.99,
        desconto: 30
    },
    {
        id: 25,
        nome: "Elden Ring",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "RPG, Ação, Aventura, Fantasia, Mundo Aberto",
        nota: 9.5,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 26,
        nome: "Hollow Knight",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/367520/header.jpg",
        plataforma: "PC, PS4, Xbox One, Nintendo Switch",
        genero: "Ação, Aventura, Mundo Aberto, Fantasia, Indie",
        nota: 9.0,
        preco: 39.99,
        desconto: 30
    },
    {
        id: 27,
        nome: "Batman: Arkham Asylum",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/35140/header.jpg",
        plataforma: "PC, PS4, Ps5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Super-herói",
        nota: 7.0,
        preco: 49.99,
        desconto: 30
    },
    {
        id: 28,
        nome: "Batman: Arkham City",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/202970/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Super-herói",
        nota: 8.5,
        preco: 49.99,
        desconto: 30
    },
    {
        id: 30,
        nome: "Subnautica: Below Zero",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/848450/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Sobrevivência, Fantasia",
        nota: 5.7,
        preco: 59.99,
        desconto: 30
    },
    {
        id: 37,
        nome: "Lies of P",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/1627720/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "RPG, Ação, Aventura, Fantasia, Mundo Aberto",
        nota: 8.5,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 38,
        nome: "Hogwarts Legacy",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "RPG, Ação, Aventura, Fantasia, Mundo Aberto",
        nota: 7.2,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 39,
        nome: "Resident Evil 4 Remake",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Terror, Fantasia",
        nota: 8.5,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 40,
        nome: "Resident Evil 2 Remake",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/883710/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Terror, Fantasia",
        nota: 8.5,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 41,
        nome: "Resident Evil 3 Remake",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/952060/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Terror, Fantasia",
        nota: 5.5,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 42,
        nome: "Resident Evil 5",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/21690/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Terror, Fantasia",
        nota: 8.0,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 43,
        nome: "Resident Evil 6",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/221040/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Terror, Fantasia",
        nota: 6.7,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 44,
        nome: "Resident Evil Revelations",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/222480/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Terror, Fantasia",
        nota: 8.0,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 45,
        nome: "Resident Evil Revelations 2",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/287290/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Terror, Fantasia",
        nota: 8.0,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 46,
        nome: "Resident Evil 0",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/339340/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Terror, Fantasia",
        nota: 8.0,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 48,
        nome: "Resident Evil 7: Biohazard",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/418370/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Terror, Fantasia",
        nota: 8.5,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 49,
        nome: "Resident Evil 8: Village",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/1196590/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Terror, Fantasia",
        nota: 8.5,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 51,
        nome: "Resident Evil",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/304240/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Terror, Fantasia",
        nota: 8.0,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 53,
        nome: "Silksong",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/1030300/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Fantasia, Indie",
        nota: 9.0,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 54,
        nome: "Palword",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/1623730/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Fantasia, Indie",
        nota: 8.5,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 55,
        nome: "Rust",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/252490/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Sobrevivência, Indie",
        nota: 8.0,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 56,
        nome: "The Forest",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/242760/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Sobrevivência, Indie",
        nota: 8.0,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 57,
        nome: "Green Hell",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/815370/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Sobrevivência, Indie",
        nota: 8.0,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 58,
        nome: "Raft",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/648800/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Sobrevivência, Indie",
        nota: 8.0,
        preco: 199.99,
        desconto: 30
    },
    {
        id: 59,
        nome: "Sons of The Forest",
        imagem: "https://cdn.cloudflare.steamstatic.com/steam/apps/1326470/header.jpg",
        plataforma: "PC, PS4, PS5, Xbox One, Xbox Series X/S",
        genero: "Ação, Aventura, Mundo Aberto, Sobrevivência, Indie",
        nota: 8.0,
        preco: 199.99,
        desconto: 30
    },
];

export default jogos;