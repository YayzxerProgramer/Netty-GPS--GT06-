import { createContext, useContext } from "react";

/** Contexto de los avisos (toasts) del panel. El proveedor está en AdminUI. */
export const ContextoAvisos = createContext(() => {});

export function useAvisar() {
  return useContext(ContextoAvisos);
}
