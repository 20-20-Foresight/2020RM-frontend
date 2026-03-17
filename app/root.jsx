import { ColorModeScript, ChakraProvider, extendTheme } from "@chakra-ui/react";
import { withEmotionCache } from "@emotion/react";
import { useState, useMemo } from "react";
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import { createEmotionCache } from "./emotion-cache";

const theme = extendTheme({
  initialColorMode: "system",
  useSystemColorMode: true
});

const Document = withEmotionCache(({ children }, emotionCache) => {
  const serverSsrStyles = useMemo(() => {
    const styles = emotionCache.inserted;
    const styleKeys = Object.keys(styles);
    if (styleKeys.length === 0) return null;
    return styleKeys.map((key) => (
      <style
        key={key}
        data-emotion={`${emotionCache.key} ${key}`}
        dangerouslySetInnerHTML={{ __html: styles[key] }}
      />
    ));
  }, [emotionCache]);

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
        {serverSsrStyles}
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
  const [cache] = useState(() => createEmotionCache());
  return (
    <Document>
      <ColorModeScript initialColorMode={theme.config?.initialColorMode} />
      <ChakraProvider theme={theme} resetCSS>
        <Outlet />
      </ChakraProvider>
    </Document>
  );
}

