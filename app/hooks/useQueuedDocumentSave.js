import { useEffect, useRef, useState } from "react";
import { useFetcher } from "@remix-run/react";
import { createQueuedSaveController } from "../models/queued-save-controller.mjs";

/**
 * Manages optimistic queued saves for one admin-data editor screen.
 * @param {{
 *   pathname?: string,
 *   initialSummary?: {version?: number|null, lastmodifieddate?: string|null, lastmodifiedby?: string|null},
 *   buildFormData: (summary: {version: number|null, lastmodifieddate: string|null, lastmodifiedby: string|null}) => FormData
 * }} options
 * @returns {{
 *   fetcher: ReturnType<typeof useFetcher>,
 *   saveSummary: {version: number|null, lastmodifieddate: string|null, lastmodifiedby: string|null},
 *   isSaving: boolean,
 *   hasQueuedSave: boolean,
 *   savedVisible: boolean,
 *   saveError: {message?: string}|null,
 *   requestSave: (buildFormData?: ((summary: {version: number|null, lastmodifieddate: string|null, lastmodifiedby: string|null}) => FormData)|null) => void,
 *   clearSaveError: () => void
 * }}
 */
export function useQueuedDocumentSave(options) {
  const fetcher = useFetcher();
  const controllerRef = useRef(createQueuedSaveController(options.initialSummary));
  const buildFormDataRef = useRef(options.buildFormData);
  const previousFetcherStateRef = useRef(fetcher.state);
  const [controllerState, setControllerState] = useState(() => controllerRef.current.getState());
  const [saveSummary, setSaveSummary] = useState(() => controllerRef.current.getSummary());
  const [savedVisible, setSavedVisible] = useState(false);
  const [saveError, setSaveError] = useState(null);

  buildFormDataRef.current = options.buildFormData;

  /**
   * Submits the latest editor state in the background.
   */
  function submitLatest(overrideBuildFormData = null) {
    const buildFormData = typeof overrideBuildFormData === "function" ? overrideBuildFormData : buildFormDataRef.current;

    fetcher.submit(buildFormData(controllerRef.current.getSummary()), {
      method: "post",
      action: options.pathname
    });
  }

  /**
   * Requests one queued background save.
   */
  function requestSave(overrideBuildFormData = null) {
    setSaveError(null);
    const result = controllerRef.current.requestSave();
    setControllerState(result.state);

    if (result.shouldStart) {
      submitLatest(overrideBuildFormData);
    }
  }

  useEffect(() => {
    if (previousFetcherStateRef.current !== "idle" && fetcher.state === "idle") {
      if (fetcher.data?.ok) {
        const result = controllerRef.current.completeSave(fetcher.data.saved);
        setControllerState(result.state);
        setSaveSummary(result.summary);
        setSavedVisible(true);
        setSaveError(null);

        if (result.shouldStart) {
          submitLatest();
        }
      } else {
        const result = controllerRef.current.failSave();
        setControllerState(result.state);
        setSaveError(fetcher.data?.error || { message: "Unable to save changes." });

        if (result.shouldStart) {
          submitLatest();
        }
      }
    }

    previousFetcherStateRef.current = fetcher.state;
  }, [fetcher.data, fetcher.state]);

  useEffect(() => {
    if (!savedVisible) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setSavedVisible(false);
    }, 15000);

    return () => clearTimeout(timer);
  }, [savedVisible]);

  return {
    fetcher,
    saveSummary,
    isSaving: controllerState.isSaving,
    hasQueuedSave: controllerState.hasQueuedSave,
    savedVisible,
    saveError,
    requestSave,
    clearSaveError() {
      setSaveError(null);
    }
  };
}
