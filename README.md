# Universal Games

Loja online da Universal Games: jogos de console (PS2 ao PS5, Xbox 360 e Series X/S), celulares, video games, som, TV e acessórios. O cliente **reserva pelo site e retira na loja**. A loja confirma o pagamento num **painel administrativo**.

- Site: <https://gabrielooopi98-max.github.io/Biblioteca-de-jogos/>
- Painel: <https://gabrielooopi98-max.github.io/Biblioteca-de-jogos/#/admin>

Feito com **React 19** e **Vite**. Os dados ficam no **Supabase** (banco Postgres, login e imagens). Sem o Supabase configurado, a loja funciona em modo demonstração, com o catálogo dos arquivos locais.

---

## Como rodar

```bash
npm install        # instala as dependências (só na primeira vez)
npm run dev        # abre em http://localhost:5173/Biblioteca-de-jogos/
npm run lint       # procura erros comuns no código
npm run build      # gera o site final na pasta dist/
npm run deploy     # publica no GitHub Pages
```

Para ligar o banco, crie o arquivo `.env.local` (veja `.env.example`). O passo a passo completo está em [`supabase/LEIA-ME.md`](supabase/LEIA-ME.md).

---

## Mapa das pastas

```
bibliotecajogos/
├── index.html              página base (título, ícones, fontes)
├── public/                 arquivos servidos como estão: logo, ícones, ilustrações dos produtos
├── scripts/
│   └── gerar-seed.mjs      gera supabase/seed.sql a partir de src/dados/
├── supabase/
│   ├── LEIA-ME.md          como configurar o banco, o login e a segurança
│   ├── migrations/         SQL das tabelas, regras de permissão e funções (rodar em ordem)
│   └── seed.sql            catálogo inicial para o banco
└── src/                    todo o código do site (detalhes abaixo)
```

### `src/`: o código do site

```
src/
├── main.jsx                ponto de partida: coloca o <App /> na página
├── App.jsx                 a loja: escolhe a página pela URL e guarda carrinho, desejos e reservas
│
├── dados/                  catálogo local (usado sem servidor e para gerar o seed)
│   ├── jogos.js            os 115 jogos: preço, plataformas, gêneros, trailer, capturas
│   └── produtos.js         os 30 produtos físicos e os departamentos
│
├── servicos/               tudo que conversa com o servidor (Supabase)
│   ├── supabase.js         conexão e tradução das mensagens de erro
│   ├── catalogo.js         baixa os produtos do banco e converte para o formato da loja
│   └── conta.js            contas de clientes: entrar, criar conta, recuperar senha
│
├── utilidades/             funções e hooks usados em vários lugares
│   ├── funcoes.js          preços, parcelas, Pix, imagens, recomendações, situação da reserva
│   ├── hooks.js            rotas (#/jogo/5…), armazenamento local, conta do cliente, atalhos
│   ├── senha.js            regras de senha forte e bloqueio após erros seguidos
│   └── LojaContext.js      contexto com as ações da loja (adicionar ao carrinho, desejar…)
│
├── componentes/            as peças visuais da loja, separadas por área
│   ├── layout/             o que aparece em toda página
│   │   ├── Header.jsx          barra do topo e abas do celular
│   │   ├── PaletaComandos.jsx  busca rápida (Ctrl+K)
│   │   ├── Notificacoes.jsx    avisos que aparecem no canto
│   │   └── NaoEncontrada.jsx   página 404
│   ├── comum/              peças reaproveitadas em várias telas
│   │   ├── Icones.jsx          todos os ícones (SVG) e a logo
│   │   ├── CardJogo.jsx        card de jogo + Imagem, Preco, Avaliacao, Plataformas
│   │   └── Trailer.jsx         player de trailer (carrega o hls.js só quando precisa)
│   ├── inicio/             seções da página inicial
│   │   ├── BannerDistribuidora.jsx  banner de abertura com as capas em baralho
│   │   ├── Destaques.jsx       carrossel de destaques
│   │   ├── Abas.jsx            abas com prévia (Mais vendidos, Clássicos…)
│   │   ├── Secoes.jsx          prateleiras, ofertas, categorias, garantias, rodapé
│   │   └── Universos.jsx       áreas temáticas: Soulslike e Resident Evil
│   ├── jogos/              catálogo e página de cada jogo
│   │   ├── Catalogo.jsx        página "Jogos" com filtros
│   │   ├── PaginaJogo.jsx      página de um jogo (galeria, ficha técnica, compra)
│   │   ├── Comparar.jsx        comparação lado a lado
│   │   └── BandejaComparar.jsx bandeja flutuante dos jogos marcados para comparar
│   ├── produtos/           produtos físicos
│   │   ├── Acessorios.jsx      página "Produtos", vitrines e departamentos da inicial
│   │   ├── PaginaProduto.jsx   página de um produto
│   │   └── CaixaCompra.jsx     caixa de preço e botões (usada no jogo e no produto)
│   ├── compra/             do carrinho até a retirada
│   │   ├── Gavetas.jsx         gaveta do carrinho
│   │   ├── Checkout.jsx        finalizar reserva (dados, pagamento, confirmação)
│   │   ├── Retirada.jsx        endereço e instruções de retirada
│   │   ├── Pedidos.jsx         "Minhas reservas"
│   │   └── Desejos.jsx         lista de desejos com alerta de preço
│   └── conta/              conta do cliente
│       ├── Conta.jsx           entrar, criar conta, recuperar senha e área do cliente
│       └── ConviteConta.jsx    convite que aparece na primeira visita
│
├── estilos/                CSS da loja, um arquivo por área
│   ├── index.css           junta todos na ordem certa (a ordem importa!)
│   ├── 01-tema.css         cores, fontes e medidas (variáveis --ouro, --texto…)
│   ├── 02-base.css         reset, botões, campos e peças comuns
│   ├── …                   um arquivo por área, com o mesmo nome dos componentes
│   ├── 16-responsivo.css   ajustes para tablet e celular
│   └── 17-modo-suave.css   menos animação quando o sistema pede
│
└── admin/                  painel administrativo (#/admin), carregado só por quem abre o painel
    ├── Admin.jsx           login, menu lateral, tema claro/escuro e troca de telas
    ├── admin.css           todo o visual do painel
    ├── telas/              uma tela por item do menu
    │   ├── Painel.jsx          visão geral com gráficos de vendas
    │   ├── Vendas.jsx          vendas por produto (com exportar planilha)
    │   ├── Reservas.jsx        confirmar pagamento, entregar e cancelar
    │   ├── Produtos.jsx        lista de produtos com filtros
    │   ├── ProdutoForm.jsx     cadastrar e editar produto
    │   ├── Categorias.jsx      departamentos da loja
    │   ├── Promocoes.jsx       preços e promoções com datas
    │   ├── Estoque.jsx         ajuste de estoque com motivo
    │   └── Historico.jsx       registro de tudo que foi alterado
    ├── componentes/        peças do painel
    │   ├── ui.jsx              botões, modais, campos, avisos, paginação
    │   ├── graficos.jsx        gráficos em SVG (área, rosca e barras)
    │   ├── CampoImagem.jsx     envio de imagem e galeria
    │   └── CamposPromocao.jsx  campos de promoção
    └── servicos/           dados e contas do painel
        ├── api.js              todas as consultas ao banco feitas pelo painel
        ├── vendas.js           contas de vendas (receita, ticket médio, por dia…)
        └── util.js             datas, textos do histórico e validações
```

---

## Como as peças se conectam

**1. Abrir a loja**
`main.jsx` → `App.jsx`. O `App` lê a URL com `useRota()` (em `utilidades/hooks.js`) e mostra a página certa: `#/` é a inicial, `#/explorar` o catálogo, `#/jogo/65` um jogo, `#/conta` a conta e `#/admin` o painel.

**2. Carregar o catálogo**
A loja abre na hora com os arquivos de `dados/`. Logo depois, `servicos/catalogo.js` busca a versão do banco (view `vitrine`) e troca. Assim, preço e estoque alterados no painel aparecem na loja.

**3. Reservar**
Carrinho (`compra/Gavetas.jsx`) → `compra/Checkout.jsx` → função `criar_reserva` no banco. O preço final é sempre calculado **no servidor**, nunca no navegador. A reserva aparece em "Minhas reservas" (`compra/Pedidos.jsx`), que pergunta ao banco a cada 30 segundos se a loja já confirmou.

**4. Painel**
`admin/Admin.jsx` faz o login e pergunta ao banco se a conta é administradora (`eh_admin`). Cada tela de `admin/telas/` usa `admin/servicos/api.js`. As permissões são conferidas **no banco** (Row Level Security), então ninguém consegue alterar nada só mexendo no site.

---

## Por onde começar a estudar

1. **`utilidades/funcoes.js`**: funções pequenas e puras (preço com desconto, parcelas). Boas para entender JavaScript.
2. **`componentes/comum/CardJogo.jsx`**: um componente React simples, com props e estado.
3. **`componentes/produtos/CaixaCompra.jsx`**: como um componente usa o contexto (`useLoja`) para agir no carrinho.
4. **`utilidades/hooks.js`**: hooks próprios (`useArmazenamento`, `useRota`, `useConta`).
5. **`App.jsx`**: como tudo se junta (estado global, rotas e páginas carregadas sob demanda com `lazy`).
6. **`admin/servicos/api.js`** e **`supabase/migrations/`**: como o site conversa com o banco e como o banco protege os dados.

Os nomes estão em português. Cada arquivo começa com um comentário explicando para que serve, e o CSS de cada área tem o mesmo nome da área em `componentes/`.
