import { RemixServer } from "@remix-run/react";
import { renderToString } from "react-dom/server";
import { CacheProvider } from "@emotion/react";
import createEmotionServer from "@emotion/server/create-instance";
import { createEmotionCache } from "./emotion-cache";

export default function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  const cache = createEmotionCache();
  const { extractCriticalToChunks } = createEmotionServer(cache);

  const html = renderToString(
    <CacheProvider value={cache}>
      <RemixServer context={remixContext} url={request.url} />
    </CacheProvider>
  );

  const chunks = extractCriticalToChunks(html);
  let styles = "";
  for (const style of chunks.styles) {
    styles += `<style data-emotion="${style.key} ${style.ids.join(" ")}">${style.css}</style>`;
  }

  const headers = new Headers(responseHeaders);
  headers.set("Content-Type", "text/html");

  return new Response(
    `<!DOCTYPE html>${html.replace('</head>', `${styles}</head>`)}`,
    {
      status: responseStatusCode,
      headers
    }
  );
}

