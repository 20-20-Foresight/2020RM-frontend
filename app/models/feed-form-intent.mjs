/**
 * Reads the effective feed form intent from one FormData payload.
 * Feed edit forms can submit multiple `_action` values because the default
 * update/create intent is encoded in a hidden field and destructive actions
 * are carried by the clicked submit button. The last non-empty value is the
 * active submitter intent.
 *
 * @param {FormData|null|undefined} formData
 * @param {string|null} [fallback]
 * @returns {string|null}
 */
export function readFeedFormIntent(formData, fallback = null) {
  if (!formData || typeof formData.getAll !== "function") {
    return fallback;
  }

  const values = formData
    .getAll("_action")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return values.length ? values[values.length - 1] : fallback;
}
