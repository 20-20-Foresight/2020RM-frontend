/**
 * Reads a trimmed string or an empty string.
 * @param {unknown} value
 * @returns {string}
 */
function readString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Builds a sorted unique list of known admin data types.
 * @param {Array<{type?: string|null}>} items
 * @returns {string[]}
 */
export function listAdminDataTypes(items = []) {
  return [...new Set(items.map((item) => readString(item?.type)).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "en", { sensitivity: "base" })
  );
}

/**
 * Sorts admin data items by type and then name.
 * @param {Array<{type?: string|null, name?: string|null}>} items
 * @returns {Array<object>}
 */
export function sortAdminDataItems(items = []) {
  return [...items].sort((left, right) => {
    const leftType = readString(left?.type).toLowerCase();
    const rightType = readString(right?.type).toLowerCase();
    const leftUnknown = !leftType || leftType === "unknown";
    const rightUnknown = !rightType || rightType === "unknown";

    if (leftUnknown !== rightUnknown) {
      return leftUnknown ? 1 : -1;
    }

    const typeComparison = leftType.localeCompare(rightType, "en", {
      sensitivity: "base"
    });

    if (typeComparison !== 0) {
      return typeComparison;
    }

    const leftName = readString(left?.name).toLowerCase();
    const rightName = readString(right?.name).toLowerCase();
    return leftName.localeCompare(rightName, "en", { sensitivity: "base" });
  });
}

/**
 * Filters one admin data list by optional type and search query.
 * @param {Array<{type?: string|null, name?: string|null, description?: string|null, key?: string|null}>} items
 * @param {{type?: string|null, query?: string|null}} options
 * @returns {Array<object>}
 */
export function filterAdminDataItems(items = [], options = {}) {
  const selectedType = readString(options.type).toLowerCase();
  const query = readString(options.query).toLowerCase();

  return items.filter((item) => {
    const itemType = readString(item?.type).toLowerCase();
    if (selectedType && itemType !== selectedType) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      readString(item?.name),
      readString(item?.description),
      readString(item?.key),
      readString(item?.type)
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}
