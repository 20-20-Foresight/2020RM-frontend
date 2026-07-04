export function rowMatchesColumnFilters(row, filters) {
  return Object.entries(filters || {}).every(([column, filterValue]) => {
    const normalizedFilter = String(filterValue || "").trim().toLowerCase();
    if (!normalizedFilter) {
      return true;
    }

    return String(row?.[column] || "")
      .trim()
      .toLowerCase()
      .includes(normalizedFilter);
  });
}
