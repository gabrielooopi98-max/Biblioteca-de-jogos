import { createContext, useContext } from "react";

// Ações e estado compartilhados (carrinho, lista de desejos, modal do jogo), fornecidos pelo App.
export const LojaContext = createContext(null);

export function useLoja() {
    return useContext(LojaContext);
}
