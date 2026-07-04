import createCache from "@emotion/cache";

export function createEmotionCache() {
  const cache = createCache({ key: "chakra" });
  cache.compat = true;
  return cache;
}
