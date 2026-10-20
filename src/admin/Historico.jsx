// Histórico de ações: registrado pelo próprio banco (gatilhos), com quem fez e quando. Sem senhas nem tokens.
import { useEffect, useState } from "react";
import { IconeRelogio } from "../components/Icones.jsx";
import * as api from "./api.js";
import { Cabecalho, Carregando, ErroCarregar, Paginacao, Vazio } from "./ui.jsx";
import { dataHora, resumoDetalhes, ROTULOS_ACAO } from "./util.js";

const ENTIDADES = [
    ["", "Tudo"],
    ["produto", "Produtos"],
    ["categoria", "Categorias"],
    ["reserva", "Reservas"],
];

export default function Historico() {
    const [entidade, setEntidade] = useState("");
    const [pagina, setPagina] = useState(0);
    const [dados, setDados] = useState(null);
    const [erro, setErro] = useState("");
    const [tentativa, setTentativa] = useState(0);

    useEffect(() => {
        let ativo = true;
        setDados(null);
        setErro("");
        api.listarHistorico({ pagina, entidade })
            .then((d) => ativo && setDados(d))
            .catch((e) => ativo && setErro(e.message));
        return () => {
            ativo = false;
        };
    }, [pagina, entidade, tentativa]);

    return (
        <>
            <Cabecalho titulo="Histórico" descricao="Tudo o que foi feito no painel e nas reservas, com data e responsável." />
            <div className="a-barra">
                <div className="a-segmentos" role="tablist" aria-label="Filtrar histórico">
                    {ENTIDADES.map(([id, rotulo]) => (
                        <button
                            type="button"
                            key={id}
                            role="tab"
                            aria-selected={entidade === id}
                            className={entidade === id ? "ativo" : ""}
                            onClick={() => {
                                setEntidade(id);
                                setPagina(0);
                            }}
                        >
                            {rotulo}
                        </button>
                    ))}
                </div>
            </div>

            {erro ? (
                <ErroCarregar mensagem={erro} tentarDeNovo={() => setTentativa((t) => t + 1)} />
            ) : !dados ? (
                <Carregando linhas={8} />
            ) : dados.linhas.length === 0 ? (
                <Vazio icone={IconeRelogio} titulo="Nada registrado aqui ainda" texto="As ações aparecem assim que alguém cadastrar, editar ou confirmar algo." />
            ) : (
                <>
                    <div className="a-tabela-rolagem">
                        <table className="a-tabela">
                            <thead>
                                <tr>
                                    <th>Quando</th>
                                    <th>Ação</th>
                                    <th>Detalhes</th>
                                    <th>Quem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dados.linhas.map((a) => (
                                    <tr key={a.id}>
                                        <td data-rotulo="Quando" className="a-nao-quebra">
                                            {dataHora(a.criado_em)}
                                        </td>
                                        <td data-rotulo="Ação">{ROTULOS_ACAO[a.acao] || a.acao}</td>
                                        <td data-rotulo="Detalhes">{resumoDetalhes(a)}</td>
                                        <td data-rotulo="Quem" className="a-texto-apagado">
                                            {a.usuario_email || (a.acao.includes("cliente") ? "cliente" : "sistema")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Paginacao pagina={pagina} total={dados.total} porPagina={api.POR_PAGINA_HISTORICO} aoMudar={setPagina} />
                </>
            )}
        </>
    );
}
