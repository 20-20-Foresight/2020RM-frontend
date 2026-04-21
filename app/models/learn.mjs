const LEARN_CATEGORY_COLOR_SCHEMES = Object.freeze({
  Segmentation: "purple",
  Talent: "orange",
  Market: "blue",
  Operations: "green"
});

/**
 * Returns the Chakra color scheme for one Learn category.
 * @param {string} category
 * @returns {string}
 */
export function getLearnCategoryColorScheme(category) {
  return LEARN_CATEGORY_COLOR_SCHEMES[typeof category === "string" ? category.trim() : ""] || "gray";
}
