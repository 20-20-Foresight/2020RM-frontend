/**
 * Creates a controller for one queued save pipeline.
 * Only the latest pending change is preserved while a request is in flight.
 * @param {{
 *   version?: number|null,
 *   lastmodifieddate?: string|null,
 *   lastmodifiedby?: string|null
 * }} [initialSummary]
 * @returns {{
 *   getSummary: () => {version: number|null, lastmodifieddate: string|null, lastmodifiedby: string|null},
 *   getState: () => {isSaving: boolean, hasQueuedSave: boolean},
 *   requestSave: () => {shouldStart: boolean, state: {isSaving: boolean, hasQueuedSave: boolean}},
 *   completeSave: (saved?: {version?: number|null, lastmodifieddate?: string|null, lastmodifiedby?: string|null}|null) => {shouldStart: boolean, summary: {version: number|null, lastmodifieddate: string|null, lastmodifiedby: string|null}, state: {isSaving: boolean, hasQueuedSave: boolean}},
 *   failSave: () => {shouldStart: boolean, state: {isSaving: boolean, hasQueuedSave: boolean}}
 * }}
 */
export function createQueuedSaveController(initialSummary = {}) {
  let summary = {
    version: Number.isFinite(initialSummary.version) ? Number(initialSummary.version) : null,
    lastmodifieddate: typeof initialSummary.lastmodifieddate === "string" ? initialSummary.lastmodifieddate : null,
    lastmodifiedby: typeof initialSummary.lastmodifiedby === "string" ? initialSummary.lastmodifiedby : null
  };
  let isSaving = false;
  let hasQueuedSave = false;

  /**
   * Returns the current controller state.
   * @returns {{isSaving: boolean, hasQueuedSave: boolean}}
   */
  function getState() {
    return {
      isSaving,
      hasQueuedSave
    };
  }

  return {
    getSummary() {
      return {
        ...summary
      };
    },
    getState,
    requestSave() {
      if (isSaving) {
        hasQueuedSave = true;
        return {
          shouldStart: false,
          state: getState()
        };
      }

      isSaving = true;
      return {
        shouldStart: true,
        state: getState()
      };
    },
    completeSave(saved = null) {
      isSaving = false;

      if (saved && typeof saved === "object") {
        summary = {
          version: Number.isFinite(saved.version) ? Number(saved.version) : summary.version,
          lastmodifieddate: typeof saved.lastmodifieddate === "string" ? saved.lastmodifieddate : summary.lastmodifieddate,
          lastmodifiedby: typeof saved.lastmodifiedby === "string" ? saved.lastmodifiedby : summary.lastmodifiedby
        };
      }

      const shouldStart = hasQueuedSave;
      hasQueuedSave = false;
      if (shouldStart) {
        isSaving = true;
      }

      return {
        shouldStart,
        summary: {
          ...summary
        },
        state: getState()
      };
    },
    failSave() {
      isSaving = false;

      const shouldStart = hasQueuedSave;
      hasQueuedSave = false;
      if (shouldStart) {
        isSaving = true;
      }

      return {
        shouldStart,
        state: getState()
      };
    }
  };
}
