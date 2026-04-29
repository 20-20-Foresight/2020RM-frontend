import { CacheProvider } from "@emotion/react";
import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { ClientStyleContext } from "./emotion-context";
import { createEmotionCache } from "./emotion-cache";

const cache = createEmotionCache();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <ClientStyleContext.Provider
        value={{
          reset() {}
        }}
      >
        <CacheProvider value={cache}>
          <RemixBrowser />
        </CacheProvider>
      </ClientStyleContext.Provider>
    </StrictMode>
  );
});
