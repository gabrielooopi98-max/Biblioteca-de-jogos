import { useState } from "react";
import CardJogo from "./CardJogo.jsx";
import Header from "./Header.jsx";
import jogos from "./dadosJogos";
import "./App.css";

function App() {
  const [busca, setBusca] = useState("");
  const [painelAberto, setPainelAberto] = useState(false);
  const mostrarPainel = painelAberto && busca.trim().length > 0;

  const jogosFiltrados = jogos.filter((jogo) =>
    jogo.nome.toLowerCase().includes(busca.trim().toLowerCase())
  );

  return (
    <>
      <Header
        busca={busca}
        setBusca={setBusca}
        jogosFiltrados={jogosFiltrados}
        painelAberto={painelAberto}
        setPainelAberto={setPainelAberto}
      />

      <div
        className={mostrarPainel ? "sobreposicao-busca ativa" : "sobreposicao-busca"}
        aria-hidden="true"
        onClick={() => setPainelAberto(false)}
      />

      <div className="lista-jogos">
        {jogos.map((jogo) => (
          <CardJogo
            key={jogo.id}
            imagem={jogo.imagem}
            nome={jogo.nome}
            plataforma={jogo.plataforma}
            descricao={jogo.descricao}
            genero={jogo.genero}
            nota={jogo.nota}
            preco={jogo.preco}
            desconto={jogo.desconto}
          />
        ))}
      </div>
    </>
  );
}

export default App;