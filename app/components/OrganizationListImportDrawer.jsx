import { useRef, useState } from "react";
import { FormControl, FormLabel, Select } from "@chakra-ui/react";
import {
  ImportListDrawer,
} from "./ui/organisms/ImportListDrawer.jsx";
import {
  RESEGMENTATION_IMPORT_COLUMNS,
  buildInitialColumnMapping,
  buildMappedRows,
  parseImportWorkbook,
} from "../models/resegmentation-import.mjs";
import { countRenderableListMembers } from "../models/resegmentation-list-detail.mjs";
import {
  applyResegmentationImportLookupResults,
  buildResegmentationImportCommitRequest,
  buildResegmentationImportLookupRequests,
  countImportedMemberships,
} from "../models/resegmentation-import-session.mjs";

const MAX_ROWS = 100;
const LOOKUP_BATCH_SIZE = 5;
const UNMATCHED_COLUMN_BEHAVIOR = "save_as_membership_metadata";
const LIST_READY_POLL_INTERVAL_MS = 1500;
const LIST_READY_TIMEOUT_MS = 30000;
const APP_SIDEBAR_EXPANDED_WIDTH = "250px";
const DEFAULT_IMPORT_SCOPE = "matched_only";

export const DEFAULT_ORGANIZATION_IMPORT_SOURCE = {
  lookupPath: "/api/rest/resegmentation/import/lookup",
  importPath: "/api/rest/resegmentation/import",
  getListDetailPath(listUuid) {
    return `/api/rest/resegmentation/lists/${encodeURIComponent(listUuid)}`;
  },
  buildLookupRequests(rows, batchSize) {
    return buildResegmentationImportLookupRequests(rows, batchSize);
  },
  applyLookupResults(rows, lookupRows) {
    return applyResegmentationImportLookupResults(rows, lookupRows);
  },
  buildCommitRequest(options) {
    return buildResegmentationImportCommitRequest(options);
  },
};

/**
 * Read one trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reads one route-action response without hiding HTML/auth/404 failures behind JSON parse errors.
 * @param {Response} response
 * @returns {Promise<object>}
 */
async function readActionResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return bodyText ? JSON.parse(bodyText) : {};
    } catch (error) {
      throw new Error("The import request returned invalid JSON.");
    }
  }

  const titleMatch = bodyText.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";
  const message = title || bodyText.trim() || response.statusText || "Unexpected non-JSON response.";
  throw new Error(
    response.redirected || bodyText.includes("<!DOCTYPE")
      ? `${message}. The request returned an HTML page instead of JSON; refresh the page and sign in again if needed.`
      : message
  );
}

/**
 * Build the default destination list name for this import flow.
 * @returns {string}
 */
function buildDefaultDestinationName() {
  return `Resegmentation Test ${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Builds one destination list name from an uploaded filename.
 * @param {string} fileName
 * @returns {string}
 */
function buildDestinationNameFromFileName(fileName) {
  const trimmed = readTrimmedString(fileName);
  if (!trimmed) {
    return buildDefaultDestinationName();
  }

  return trimmed.replace(/\.[^.]+$/, "").trim() || buildDefaultDestinationName();
}

/**
 * Waits for one interval.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns whether one imported list detail is ready for use.
 * @param {object|null|undefined} listDetail
 * @param {number} expectedCount
 * @returns {boolean}
 */
function isImportedListReady(listDetail, expectedCount) {
  const memberCount = Number(listDetail?.list?.memberCount || 0);
  const visibleRows = countRenderableListMembers(listDetail);
  return memberCount >= expectedCount && visibleRows >= expectedCount;
}

/**
 * Marks valid rows as loading while lookup is in progress.
 * @param {object[]} rows
 * @returns {object[]}
 */
function markRowsLookingUp(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    if (row?.validation?.status !== "valid") {
      return row;
    }

    return {
      ...row,
      lookup: {
        status: "looking_up",
        messages: [],
        match: null,
      },
      import: {
        status: "idle",
        messages: [],
      },
    };
  });
}

/**
 * Marks rows still waiting on lookup with an error message.
 * @param {object[]} rows
 * @param {string} message
 * @returns {object[]}
 */
function markRowsLookupError(rows, message) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const isPendingLookup =
      row?.lookup?.status === "looking_up" ||
      (row?.validation?.status === "valid" && !row?.lookup);

    if (!isPendingLookup) {
      return row;
    }

    return {
      ...row,
      lookup: {
        status: "lookup_error",
        messages: [message],
        match: null,
      },
      import: {
        status: "idle",
        messages: [],
      },
    };
  });
}

/**
 * Marks matched rows as importing while the list build request is in flight.
 * @param {object[]} rows
 * @returns {object[]}
 */
function markRowsImporting(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    if (row?.lookup?.status !== "matched") {
      return row;
    }

    return {
      ...row,
      import: {
        status: "importing",
        messages: [],
      },
    };
  });
}

/**
 * Applies one import result payload back to the visible row set.
 * @param {object[]} rows
 * @param {object[]} importedRows
 * @returns {object[]}
 */
function applyImportResults(rows, importedRows) {
  const importByRowNumber = new Map(
    (Array.isArray(importedRows) ? importedRows : [])
      .filter((row) => Number.isFinite(Number(row?.rowNumber)))
      .map((row) => [Number(row.rowNumber), row])
  );

  return (Array.isArray(rows) ? rows : []).map((row) => {
    const imported = importByRowNumber.get(Number(row?.rowNumber));
    if (!imported) {
      return row;
    }

    return {
      ...row,
      lookup: {
        ...(row.lookup || {}),
        ...(imported.lookup || {}),
      },
      import: {
        status: readTrimmedString(imported.import?.status) || "imported",
        messages: Array.isArray(imported.import?.messages) ? imported.import.messages : [],
        membershipUuid: imported.import?.membershipUuid || null,
      },
    };
  });
}

/**
 * Live resegmentation import drawer bridge.
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   allowImportScopeSelection?: boolean,
 *   defaultImportScope?: "matched_only"|"include_unmatched_companies",
 *   requireListReady?: boolean,
 *   importSource?: {
 *     lookupPath?: string,
 *     importPath?: string,
 *     getListDetailPath?: (listUuid: string) => string,
 *     buildLookupRequests?: (rows: object[], batchSize: number) => object[],
 *     applyLookupResults?: (rows: object[], lookupRows: object[]) => object[],
 *     buildCommitRequest?: (options: object) => {rows: object[]}
 *   },
 *   onImportedList?: (list: object, details?: {statusExplained?: string, listDetail?: object|null}) => Promise<void>|void
 * }} props
 * @returns {JSX.Element}
 */
export default function OrganizationListImportDrawer({
  isOpen,
  onClose,
  allowImportScopeSelection = false,
  defaultImportScope = DEFAULT_IMPORT_SCOPE,
  requireListReady = true,
  importSource = DEFAULT_ORGANIZATION_IMPORT_SOURCE,
  onImportedList = () => {},
}) {
  const effectiveImportSource = {
    ...DEFAULT_ORGANIZATION_IMPORT_SOURCE,
    ...(importSource && typeof importSource === "object" ? importSource : {}),
  };
  const fileInputRef = useRef(null);
  const lookupRequestRef = useRef(0);
  const [phase, setPhase] = useState("upload");
  const [isExpanded, setIsExpanded] = useState(false);
  const [parsedImport, setParsedImport] = useState(null);
  const [sourceToDestination, setSourceToDestination] = useState({});
  const [rows, setRows] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusNotice, setStatusNotice] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPreparingList, setIsPreparingList] = useState(false);
  const [destinationName, setDestinationName] = useState(buildDefaultDestinationName());
  const [importScope, setImportScope] = useState(defaultImportScope);
  const [pendingImportedList, setPendingImportedList] = useState(null);
  const [pendingImportedCount, setPendingImportedCount] = useState(0);
  const [preparedListDetail, setPreparedListDetail] = useState(null);

  /**
   * Resets the drawer state back to the initial upload step.
   * @returns {void}
   */
  function resetState() {
    lookupRequestRef.current += 1;
    setPhase("upload");
    setIsExpanded(false);
    setParsedImport(null);
    setSourceToDestination({});
    setRows([]);
    setErrorMessage("");
    setStatusNotice(null);
    setFileName("");
    setIsLoadingFile(false);
    setIsImporting(false);
    setIsPreparingList(false);
    setDestinationName(buildDefaultDestinationName());
    setImportScope(defaultImportScope);
    setPendingImportedList(null);
    setPendingImportedCount(0);
    setPreparedListDetail(null);
  }

  /**
   * Handles one close request from the drawer.
   * @returns {void}
   */
  function handleClose() {
    resetState();
    onClose();
  }

  /**
   * Runs live backend lookup for the current mapped rows.
   * @param {object[]} nextRows
   * @returns {Promise<void>}
   */
  async function lookupRows(nextRows) {
    const requestId = lookupRequestRef.current + 1;
    lookupRequestRef.current = requestId;
    let currentRows = markRowsLookingUp(nextRows);
    setRows(currentRows);
    setPhase("lookup");

    const lookupRequests =
      typeof effectiveImportSource.buildLookupRequests === "function"
        ? effectiveImportSource.buildLookupRequests(nextRows, LOOKUP_BATCH_SIZE)
        : [];
    if (!lookupRequests.length) {
      setRows(nextRows);
      setPhase("review");
      return;
    }

    try {
      for (const lookupRequest of lookupRequests) {
        const response = await fetch(effectiveImportSource.lookupPath, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(lookupRequest),
        });
        const payload = await readActionResponse(response);
        if (!response.ok) {
          throw new Error(payload?.message || payload?.error || "Import lookup failed.");
        }

        if (lookupRequestRef.current !== requestId) {
          return;
        }

        currentRows =
          typeof effectiveImportSource.applyLookupResults === "function"
            ? effectiveImportSource.applyLookupResults(currentRows, payload.rows)
            : currentRows;
        setRows(currentRows);
      }

      setErrorMessage("");
      setStatusNotice(null);
      setPhase("review");
    } catch (error) {
      if (lookupRequestRef.current !== requestId) {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Unable to match imported organizations.";
      setRows(markRowsLookupError(currentRows, message));
      setErrorMessage(message);
      setPhase("review");
    }
  }

  /**
   * Applies one parsed workbook into the live drawer state and auto-runs lookup.
   * @param {object} nextParsedImport
   * @returns {Promise<void>}
   */
  async function applyParsedImport(nextParsedImport) {
    const nextMapping = buildInitialColumnMapping(
      nextParsedImport.sourceColumns,
      nextParsedImport.sourceRows
    );
    const nextRows = buildMappedRows({
      sourceColumns: nextParsedImport.sourceColumns,
      sourceRows: nextParsedImport.sourceRows,
      sourceToDestination: nextMapping,
    });

    setParsedImport(nextParsedImport);
    setSourceToDestination(nextMapping);
    setErrorMessage("");
    setStatusNotice(null);
    await lookupRows(nextRows);
  }

  /**
   * Loads one list detail payload from the live page API.
   * @param {string} listUuid
   * @returns {Promise<object|null>}
   */
  async function loadListDetail(listUuid) {
    const response = await fetch(
      effectiveImportSource.getListDetailPath(listUuid),
      {
        method: "GET",
        credentials: "same-origin",
      }
    );
    const payload = await readActionResponse(response);
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || "Unable to load imported list.");
    }
    return payload.listDetail || null;
  }

  /**
   * Waits until the imported list is visible through the list-detail endpoint.
   * @param {{list: object|null, expectedCount: number, initialListDetail?: object|null}} options
   * @returns {Promise<{list: object, listDetail: object}|null>}
   */
  async function waitForImportedListReady(options) {
    const listUuid = readTrimmedString(options?.list?.uuid);
    const expectedCount = Number(options?.expectedCount || 0);
    if (!listUuid || expectedCount <= 0) {
      return null;
    }

    if (!requireListReady) {
      return {
        list: options.list,
        listDetail: options.initialListDetail || null,
      };
    }

    const initialListDetail = options?.initialListDetail || null;
    if (isImportedListReady(initialListDetail, expectedCount)) {
      return {
        list: initialListDetail.list || options.list,
        listDetail: initialListDetail,
      };
    }

    setIsPreparingList(true);
    setStatusNotice({
      status: "info",
      message: `Imported ${expectedCount} organizations. Preparing the list for use...`,
    });

    const deadline = Date.now() + LIST_READY_TIMEOUT_MS;
    let lastListDetail = initialListDetail;

    try {
      while (Date.now() < deadline) {
        await sleep(LIST_READY_POLL_INTERVAL_MS);
        lastListDetail = await loadListDetail(listUuid);
        if (isImportedListReady(lastListDetail, expectedCount)) {
          return {
            list: lastListDetail.list || options.list,
            listDetail: lastListDetail,
          };
        }
      }
    } finally {
      setIsPreparingList(false);
    }

    setStatusNotice({
      status: "warning",
      message:
        "The import finished, but the list is still loading. Keep this drawer open and check again in a moment.",
    });
    return null;
  }

  /**
   * Parses one selected file and starts the live lookup flow.
   * @param {File} file
   * @returns {Promise<void>}
   */
  async function parseFile(file) {
    const nextFileName = file?.name || "";
    setFileName(nextFileName);
    setIsLoadingFile(true);
    setErrorMessage("");
    setDestinationName(buildDestinationNameFromFileName(nextFileName));

    try {
      const buffer = await file.arrayBuffer();
      await applyParsedImport(parseImportWorkbook(buffer, { maxRows: MAX_ROWS }));
    } catch (error) {
      setParsedImport(null);
      setSourceToDestination({});
      setRows([]);
      setErrorMessage(error instanceof Error ? error.message : "Unable to parse file.");
      setPhase("upload");
    } finally {
      setIsLoadingFile(false);
    }
  }

  const matchedRows = rows.filter((row) => row.lookup?.status === "matched");

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            parseFile(file).catch((error) => {
              setErrorMessage(error instanceof Error ? error.message : "Unable to parse file.");
            });
          }
          event.target.value = "";
        }}
      />

      <ImportListDrawer
        isOpen={isOpen}
        onClose={handleClose}
        title="Import list members"
        description="Upload a CSV/XLSX file, review matched organizations, and create an organization list."
        subjectLabelSingular="organization"
        subjectLabelPlural="organizations"
        destinationLabel="Destination List Name"
        phase={phase}
        parsedImport={parsedImport}
        sourceToDestination={sourceToDestination}
        rows={rows}
        maxRows={MAX_ROWS}
        columnDefinitions={RESEGMENTATION_IMPORT_COLUMNS}
        destinationMode="new"
        destinationName={destinationName}
        unmatchedColumnBehavior={UNMATCHED_COLUMN_BEHAVIOR}
        additionalReviewControls={
          allowImportScopeSelection ? (
            <FormControl>
              <FormLabel fontSize="sm">Import Scope</FormLabel>
              <Select
                size="sm"
                value={importScope}
                onChange={(event) => setImportScope(event.target.value)}
                isDisabled={isImporting || isPreparingList || phase === "complete"}
              >
                <option value="matched_only">Matched organizations only</option>
                <option value="include_unmatched_companies">Include unmatched companies</option>
              </Select>
            </FormControl>
          ) : null
        }
        parserError={errorMessage}
        statusNotice={statusNotice}
        isExpanded={isExpanded}
        expandedWidth={{ base: "100vw", lg: `calc(100vw - ${APP_SIDEBAR_EXPANDED_WIDTH})` }}
        onToggleExpanded={() => setIsExpanded((currentValue) => !currentValue)}
        reviewTableHeight="46vh"
        fileName={fileName}
        isLoadingFile={isLoadingFile}
        isImporting={isImporting || isPreparingList}
        busyTitle="Building List"
        busyDescription="You can close this flyout, but the list will not be usable until the loading is complete."
        isImportDisabled={
          isPreparingList ||
          phase === "lookup" ||
          (
            phase !== "complete" &&
            (!preparedListDetail && (!parsedImport || !matchedRows.length))
          ) ||
          (phase === "complete" && !pendingImportedList?.uuid)
        }
        importButtonLabel={preparedListDetail ? "Open List" : "Import"}
        completeButtonLabel={preparedListDetail ? "Open List" : "Check Again"}
        onDestinationNameChange={(value) => setDestinationName(value)}
        isDestinationNameEditable={phase !== "complete" && !isImporting && !isPreparingList}
        onSourceMappingChange={(sourceKey, destinationKey) => {
          if (!parsedImport) {
            return;
          }

          const nextMapping = {
            ...sourceToDestination,
            [sourceKey]: destinationKey,
          };
          const nextRows = buildMappedRows({
            sourceColumns: parsedImport.sourceColumns,
            sourceRows: parsedImport.sourceRows,
            sourceToDestination: nextMapping,
          });

          setSourceToDestination(nextMapping);
          lookupRows(nextRows).catch((error) => {
            setErrorMessage(error instanceof Error ? error.message : "Unable to match imported organizations.");
          });
        }}
        onSelectFile={() => fileInputRef.current?.click()}
        onFileDropped={(file) => {
          parseFile(file).catch((error) => {
            setErrorMessage(error instanceof Error ? error.message : "Unable to parse file.");
          });
        }}
        onImport={async () => {
          if (phase === "complete" && preparedListDetail && pendingImportedList?.uuid) {
            await onImportedList(preparedListDetail.list || pendingImportedList, {
              statusExplained: `Imported ${pendingImportedCount} organizations into ${preparedListDetail.list?.name || pendingImportedList.name || pendingImportedList.uuid}.`,
              listDetail: preparedListDetail,
            });
            handleClose();
            return;
          }

          if (phase === "complete" && pendingImportedList?.uuid) {
            const readyResult = await waitForImportedListReady({
              list: pendingImportedList,
              expectedCount: pendingImportedCount,
              initialListDetail: preparedListDetail,
            });
            if (!readyResult) {
              return;
            }

            setPreparedListDetail(readyResult.listDetail);
            setStatusNotice({
              status: "success",
              message: `Imported list is ready. Opening ${readyResult.list.name || "list"}...`,
            });
            await onImportedList(readyResult.list, {
              statusExplained: `Imported ${pendingImportedCount} organizations into ${readyResult.list.name || readyResult.list.uuid}.`,
              listDetail: readyResult.listDetail,
            });
            handleClose();
            return;
          }

          const request = effectiveImportSource.buildCommitRequest({
            destinationName,
            importScope,
            rows,
            unmatchedColumnBehavior: UNMATCHED_COLUMN_BEHAVIOR,
          });
          if (!request.rows.length) {
            return;
          }

          setIsImporting(true);
          setRows(markRowsImporting(rows));
          setErrorMessage("");
          setStatusNotice({
            status: "info",
            message: `Importing ${request.rows.length} ${importScope === "include_unmatched_companies" ? "companies" : "organizations"} into ${destinationName}...`,
          });

          try {
            const response = await fetch(effectiveImportSource.importPath, {
              method: "POST",
              credentials: "same-origin",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify(request),
            });
            const payload = await readActionResponse(response);
            if (!response.ok) {
              throw new Error(payload?.message || payload?.error || "Import failed.");
            }

            const nextRows = applyImportResults(rows, payload.rows);
            const importedCount =
              Number(payload?.meta?.importedCount || 0) +
                Number(payload?.meta?.stagedCandidateCount || 0) ||
              countImportedMemberships(payload.rows) ||
              request.rows.length;
            setRows(nextRows);
            setPhase("complete");
            setPendingImportedList(payload.list || null);
            setPendingImportedCount(importedCount);
            setPreparedListDetail(null);

            const readyResult = await waitForImportedListReady({
              list: payload.list || null,
              expectedCount: importedCount,
              initialListDetail: payload.listDetail || null,
            });
            if (!readyResult) {
              return;
            }

            setPreparedListDetail(readyResult.listDetail);
            setStatusNotice({
              status: "success",
              message: `Imported list is ready. Opening ${readyResult.list.name || "list"}...`,
            });
            await onImportedList(readyResult.list, {
              statusExplained: payload.statusExplained || "",
              listDetail: readyResult.listDetail,
            });
            handleClose();
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Unable to import organizations.");
            setStatusNotice(null);
          } finally {
            setIsImporting(false);
          }
        }}
      />
    </>
  );
}
