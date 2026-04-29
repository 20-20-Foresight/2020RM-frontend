import { RemixServer } from "@remix-run/react";
import { renderToString } from "react-dom/server";
import { CacheProvider } from "@emotion/react";
import createEmotionServer from "@emotion/server/create-instance";
import { createEmotionCache } from "./emotion-cache";
import { ClientStyleContext, ServerStyleContext } from "./emotion-context";

export default function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  const cache = createEmotionCache();
  const { extractCriticalToChunks } = createEmotionServer(cache);

  const app = (
    <ClientStyleContext.Provider value={{ reset() {} }}>
      <CacheProvider value={cache}>
        <RemixServer context={remixContext} url={request.url} />
      </CacheProvider>
    </ClientStyleContext.Provider>
  );

  const html = renderToString(
    <ServerStyleContext.Provider value={null}>{app}</ServerStyleContext.Provider>
  );

  const chunks = extractCriticalToChunks(html);
  const styles = chunks.styles.filter((style) => style.ids.length > 0);

  const headers = new Headers(responseHeaders);
  headers.set("Content-Type", "text/html");

  const markup = renderToString(
    <ServerStyleContext.Provider value={styles}>{app}</ServerStyleContext.Provider>
  );

  return new Response(`<!DOCTYPE html>${markup}`, {
    status: responseStatusCode,
    headers
  });
}
