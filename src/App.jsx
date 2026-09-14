import { useEffect, useState } from "react";
import CardJogo from "./CardJogo.jsx";
import CarrinhoPainel from "./CarrinhoPainel.jsx";
import Header from "./header.jsx";
import jogos from "./dadosJogos";
import "./App.css";

function App() {
  const [busca, setBusca] = useState("");
  const [painelAberto, setPainelAberto] = useState(false);
  const [carrinho, setCarrinho] = useState([]);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [painelVisivel, setPainelVisivel] = useState(false);
  const [filtro, setFiltro] = useState("todos");

  // animação de abertura e fechamento do painel do carrinho.

  useEffect(() => {
    if(carrinhoAberto) {
      setPainelVisivel(true);
    } else {
      const tempo = setTimeout(() => {
        setPainelVisivel(false);
      }, 300);

      return () => clearTimeout(tempo);
    }
  }, [carrinhoAberto])

  // mostar o painel de busca apenas quando houver texto no input de busca e o painel estiver aberto.

  const mostrarPainel = painelAberto && busca.trim().length > 0;

  // função para filtrar os jogos com base na busca do usuário no input de busca.

  const jogosFiltrados = busca.trim().length > 0
  ? jogos.filter(((jogo) => jogo.nome.toLowerCase().includes(busca.toLowerCase())))
  : [];

  // função para Filtra e ordena os jogos com base no filtro selecionado.

  const jogosExibidos = [...jogos].filter((jogo) => {
    if(filtro === "desconto") return jogo.desconto > 0;
    return true;
  })
  .sort((a, b) => {
    if(filtro === "menor-preco") return a.preco - b.preco;
    if(filtro === "maior-preco") return b.preco - a.preco;
    return 0;
  });

  // funções para adicionar e remover jogos do carrinho.

  function adicionarAoCarrinho(jogo) {
    setCarrinho((itensAtuais) => {
      const jaExiste = itensAtuais.find((item) => item.id === jogo.id);
      if (jaExiste) return itensAtuais;
      return [...itensAtuais, jogo];
    });

    setCarrinhoAberto(true);
  }

  function removerJogoCarrinho(id) {
    setCarrinho((jogosAtuais) => jogosAtuais.filter((jogo) => jogo.id !== id));
  }

  function fecharPainelCarrinho() {
    setCarrinhoAberto(false);
  }

  const totalPrecoCarrinho = carrinho.reduce((soma, jogo) => {
    return soma + jogo.preco * (1 - (jogo.desconto || 0) / 100);
  }, 0);

  return (
    <>
      <Header
        busca={busca}
        setBusca={setBusca}
        jogosFiltrados={jogosFiltrados}
        painelAberto={painelAberto}
        setPainelAberto={setPainelAberto}
        totalItensCarrinho={carrinho.length}
        carrinhoAberto={carrinhoAberto}
        setCarrinhoAberto={setCarrinhoAberto}
        adicionarAoCarrinho={adicionarAoCarrinho}
        carrinho={carrinho}
      />

      <nav className="submenu-filtros">
        <button
          className={filtro === "todos" ? "filtro-ativo" : ""}
          onClick={() => setFiltro("todos")}
        >
          Todos
        </button>
        <button
          className={filtro === "desconto" ? "filtro-ativo" : ""}
          onClick={() => setFiltro("desconto")}
        >
          Jogos com desconto
        </button>
        <button
          className={filtro === "menor-preco" ? "filtro-ativo" : ""}
          onClick={() => setFiltro("menor-preco")}
        >
          Menor Preço
        </button>
        <button
          className={filtro === "maior-preco" ? "filtro-ativo" : ""}
          onClick={() => setFiltro("maior-preco")}
        >
          Maior Preço
        </button>
      </nav>

      {painelVisivel && (
        <CarrinhoPainel
          carrinho={carrinho}
          totalPrecoCarrinho={totalPrecoCarrinho}
          removerJogoCarrinho={removerJogoCarrinho}
          fecharPainelCarrinho={fecharPainelCarrinho}
          carrinhoAberto={carrinhoAberto}
        />
      )}

      <div
        className={mostrarPainel ? "sobreposicao-busca ativa" : "sobreposicao-busca"}
        aria-hidden="true"
        onClick={() => setPainelAberto(false)}
      />

      <div key={filtro} className="lista-jogos">
        {jogosExibidos.map((jogo) => (
          <CardJogo
            key={jogo.id}
            jogo={jogo}
            adicionarAoCarrinho={adicionarAoCarrinho}
            jaNoCarrinho={carrinho.some((item) => item.id === jogo.id)}
          />
        ))}
      </div>
    </>
  );
}

export default App;