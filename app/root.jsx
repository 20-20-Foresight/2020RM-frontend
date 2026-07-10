import { ColorModeScript, ChakraProvider } from "@chakra-ui/react";
import { withEmotionCache } from "@emotion/react";
import { useContext, useEffect } from "react";
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import { ClientStyleContext, ServerStyleContext } from "./emotion-context";
import { theme } from "./theme";

const Document = withEmotionCache(({ children }, emotionCache) => {
  const serverStyleData = useContext(ServerStyleContext);
  const clientStyleData = useContext(ClientStyleContext);

  useEffect(() => {
    emotionCache.sheet.container = document.head;

    const tags = emotionCache.sheet.tags;
    emotionCache.sheet.flush();

    tags.forEach((tag) => {
      emotionCache.sheet._insertTag(tag);
    });

    clientStyleData.reset();
  }, [clientStyleData, emotionCache]);

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
        {serverStyleData
          ? serverStyleData.map(({ key, ids, css }) => (
              <style
                key={key}
                data-emotion={`${key} ${ids.join(" ")}`}
                dangerouslySetInnerHTML={{ __html: css }}
              />
            ))
          : null}
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
});

export default function App() {
  return (
    <Document>
      <ColorModeScript initialColorMode={theme.config?.initialColorMode} />
      <ChakraProvider theme={theme} resetCSS>
        <Outlet />
      </ChakraProvider>
    </Document>
  );
}
