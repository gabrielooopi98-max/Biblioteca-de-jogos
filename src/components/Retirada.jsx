import { DIAS_PARA_RETIRAR, LOJA } from "../utils.js";
import { IconeLoja } from "./Icones.jsx";

// Onde e como retirar a reserva: checkout, confirmação e Minhas reservas.
export function InfoRetirada({ compacta = false }) {
    return (
        <div className={compacta ? "retirada-info compacta" : "retirada-info"}>
            <IconeLoja tamanho={20} />
            <div>
                <strong>Retirada na loja</strong>
                <span>{LOJA.endereco}</span>
                <span>{LOJA.horario}</span>
                {!compacta && (
                    <small>
                        A loja confirma o pagamento e separa seus itens. Quando estiver pronto, é só retirar em até {DIAS_PARA_RETIRAR} dias com o código da reserva e um documento com foto.
                    </small>
                )}
            </div>
        </div>
    );
}
