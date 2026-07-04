import { createContext } from "react";

export const ClientStyleContext = createContext({
  reset() {}
});

export const ServerStyleContext = createContext(null);
