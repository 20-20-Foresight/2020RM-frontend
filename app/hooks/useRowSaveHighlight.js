import { useEffect, useRef, useState } from "react";

/**
 * Tracks optimistic row-level save highlights for modal-driven editors.
 * Rows turn blue immediately, then green once the queued save completes successfully.
 * @param {{
 *   isSaving?: boolean,
 *   savedVisible?: boolean,
 *   saveErrorMessage?: string|null
 * }} options
 * @returns {{
 *   rowHighlightStateByKey: Record<string, "saving"|"saved">,
 *   markRowsChanged: (rowKeys: Array<string|number|null|undefined>) => void
 * }}
 */
export function useRowSaveHighlight(options) {
  const [rowHighlightStateByKey, setRowHighlightStateByKey] = useState({});
  const pendingRowKeysRef = useRef(new Set());
  const savedTimersRef = useRef(new Map());

  /**
   * Clears one saved highlight timer.
   * @param {string} rowKey
   */
  function clearSavedTimer(rowKey) {
    const timer = savedTimersRef.current.get(rowKey);
    if (timer) {
      clearTimeout(timer);
      savedTimersRef.current.delete(rowKey);
    }
  }

  /**
   * Marks one or more rows as locally changed.
   * @param {Array<string|number|null|undefined>} rowKeys
   */
  function markRowsChanged(rowKeys) {
    const normalizedRowKeys = rowKeys
      .map((rowKey) => (rowKey == null ? "" : String(rowKey)))
      .filter(Boolean);

    if (!normalizedRowKeys.length) {
      return;
    }

    normalizedRowKeys.forEach((rowKey) => {
      pendingRowKeysRef.current.add(rowKey);
      clearSavedTimer(rowKey);
    });

    setRowHighlightStateByKey((currentValue) => ({
      ...currentValue,
      ...Object.fromEntries(normalizedRowKeys.map((rowKey) => [rowKey, "saving"]))
    }));
  }

  useEffect(() => {
    if (options.isSaving || !options.savedVisible || !pendingRowKeysRef.current.size) {
      return;
    }

    const savedKeys = Array.from(pendingRowKeysRef.current);
    pendingRowKeysRef.current.clear();

    setRowHighlightStateByKey((currentValue) => ({
      ...currentValue,
      ...Object.fromEntries(savedKeys.map((rowKey) => [rowKey, "saved"]))
    }));

    savedKeys.forEach((rowKey) => {
      clearSavedTimer(rowKey);
      const timer = setTimeout(() => {
        setRowHighlightStateByKey((currentValue) => {
          const nextValue = { ...currentValue };
          delete nextValue[rowKey];
          return nextValue;
        });
        savedTimersRef.current.delete(rowKey);
      }, 15000);

      savedTimersRef.current.set(rowKey, timer);
    });
  }, [options.isSaving, options.savedVisible]);

  useEffect(() => {
    if (!options.saveErrorMessage || !pendingRowKeysRef.current.size) {
      return;
    }

    const pendingKeys = Array.from(pendingRowKeysRef.current);
    pendingRowKeysRef.current.clear();

    setRowHighlightStateByKey((currentValue) => {
      const nextValue = { ...currentValue };
      pendingKeys.forEach((rowKey) => {
        delete nextValue[rowKey];
      });
      return nextValue;
    });
  }, [options.saveErrorMessage]);

  useEffect(
    () => () => {
      Array.from(savedTimersRef.current.values()).forEach((timer) => clearTimeout(timer));
      savedTimersRef.current.clear();
    },
    []
  );

  return {
    rowHighlightStateByKey,
    markRowsChanged
  };
}
