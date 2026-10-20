// Campos de preço promocional, início e fim, com a prévia do preço final e do desconto.
// Usados no formulário de produto e na tela de promoções. As mesmas regras são conferidas no banco.
import { formatarPreco } from "../utils.js";
import { percentualDesconto, promocaoVigente } from "./api.js";
import { Campo, Interruptor } from "./ui.jsx";
import { dataHora, deCampoData, FUSO, lerPreco } from "./util.js";

export function CamposPromocao({ valores, aoMudar, erros = {} }) {
    const original = lerPreco(valores.preco);
    const promocional = lerPreco(valores.preco_promocional);
    const pct = percentualDesconto(original, promocional);
    const comoBanco = {
        promocao_ativa: valores.promocao_ativa,
        preco_promocional: Number.isFinite(promocional) ? promocional : null,
        promocao_inicio: deCampoData(valores.promocao_inicio),
        promocao_fim: deCampoData(valores.promocao_fim),
    };
    const vale = promocaoVigente(comoBanco);
    const agendada = valores.promocao_ativa && comoBanco.promocao_inicio && new Date(comoBanco.promocao_inicio) > new Date();
    const encerrada = valores.promocao_ativa && comoBanco.promocao_fim && new Date(comoBanco.promocao_fim) <= new Date();

    return (
        <>
            <Interruptor marcado={valores.promocao_ativa} aoMudar={(v) => aoMudar({ promocao_ativa: v })} rotulo="Promoção" descricao="O preço original continua salvo; a loja mostra o promocional só durante o período." />
            {valores.promocao_ativa && (
                <div className="a-grade">
                    <Campo rotulo="Preço promocional (R$)" erro={erros.preco_promocional} largura={4}>
                        {(id) => <input id={id} inputMode="decimal" placeholder="0,00" value={valores.preco_promocional} onChange={(e) => aoMudar({ preco_promocional: e.target.value })} />}
                    </Campo>
                    <Campo rotulo="Começa em" dica="Vazio: começa agora" largura={4}>
                        {(id) => <input id={id} type="datetime-local" value={valores.promocao_inicio} onChange={(e) => aoMudar({ promocao_inicio: e.target.value })} />}
                    </Campo>
                    <Campo rotulo="Termina em" erro={erros.promocao_fim} dica="Vazio: sem data para acabar" largura={4}>
                        {(id) => <input id={id} type="datetime-local" value={valores.promocao_fim} onChange={(e) => aoMudar({ promocao_fim: e.target.value })} />}
                    </Campo>
                </div>
            )}
            <div className="a-previa-preco" aria-live="polite">
                {original == null || Number.isNaN(original) ? (
                    <span className="a-texto-apagado">Informe o preço para ver a prévia.</span>
                ) : valores.promocao_ativa && Number.isFinite(promocional) && pct > 0 ? (
                    <>
                        <span className="a-riscado">{formatarPreco(original)}</span>
                        <strong>{formatarPreco(promocional)}</strong>
                        <span className="a-selo ouro">-{pct}%</span>
                        <small>
                            {vale
                                ? `Vale agora${comoBanco.promocao_fim ? ` até ${dataHora(comoBanco.promocao_fim)}` : ", sem data para acabar"}.`
                                : agendada
                                  ? `Agendada: começa em ${dataHora(comoBanco.promocao_inicio)}.`
                                  : encerrada
                                    ? "Já encerrada: a loja mostra o preço normal."
                                    : ""}{" "}
                            Horário de {FUSO.replace(/_/g, " ")}.
                        </small>
                    </>
                ) : (
                    <>
                        <strong>{formatarPreco(original)}</strong>
                        <small>Preço que aparece na loja.</small>
                    </>
                )}
            </div>
        </>
    );
}
