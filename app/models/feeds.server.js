/**
 * Server-side model for the Feeds settings page.
 * Currently uses mock fixture data; replace loader/action functions
 * with real API calls once the backend feeds management API is available.
 *
 * See: CRM/2020-Design/docs/feeds-api.md for the expected API contract.
 */

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_FEEDS = [
  // Preqin feeds
  {
    id: 1,
    name: "US Wealth Managers (AUM 100M–100B)",
    source: "preqin",
    description: "Targets US-based wealth managers with significant AUM",
    interval_days: 30,
    records_limit: 100,
    crm_age_days: 180,
    enabled: true,
    settings: {
      investorType: ["Wealth Manager"],
      location: ["us"],
      aum: { min: 100, max: 100000 }
    },
    last_run_started_at: "2026-04-14T14:12:31.000Z",
    last_run_completed_at: "2026-04-14T14:15:02.000Z",
    last_run_status: "complete",
    last_result_count: 312,
    last_queued_count: 100,
    last_error: null,
    next_run_at: "2026-05-14T14:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-14T14:15:02.000Z"
  },
  {
    id: 2,
    name: "US Asset Managers (AUM 100M–100B)",
    source: "preqin",
    description: "Targets US-based asset managers with significant AUM",
    interval_days: 30,
    records_limit: 150,
    crm_age_days: 180,
    enabled: true,
    settings: {
      investorType: ["Asset Manager"],
      location: ["us"],
      aum: { min: 100, max: 100000 }
    },
    last_run_started_at: "2026-04-14T14:12:31.000Z",
    last_run_completed_at: "2026-04-14T14:16:44.000Z",
    last_run_status: "complete",
    last_result_count: 876,
    last_queued_count: 150,
    last_error: null,
    next_run_at: "2026-05-14T14:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-14T14:16:44.000Z"
  },
  {
    id: 3,
    name: "US Fund of Funds (AUM 100M–100B)",
    source: "preqin",
    description: null,
    interval_days: 30,
    records_limit: 100,
    crm_age_days: 180,
    enabled: true,
    settings: {
      investorType: ["Fund of Funds Manager"],
      location: ["us"],
      aum: { min: 100, max: 100000 }
    },
    last_run_started_at: "2026-04-14T14:12:40.000Z",
    last_run_completed_at: "2026-04-14T14:13:55.000Z",
    last_run_status: "complete",
    last_result_count: 203,
    last_queued_count: 100,
    last_error: null,
    next_run_at: "2026-05-14T14:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-14T14:13:55.000Z"
  },
  {
    id: 4,
    name: "US Family Offices Multi (AUM 100M–100B)",
    source: "preqin",
    description: null,
    interval_days: 30,
    records_limit: 100,
    crm_age_days: 180,
    enabled: true,
    settings: {
      investorType: ["Family Office - Multi"],
      location: ["us"],
      aum: { min: 100, max: 100000 }
    },
    last_run_started_at: "2026-04-14T14:12:45.000Z",
    last_run_completed_at: "2026-04-14T14:14:10.000Z",
    last_run_status: "complete",
    last_result_count: 156,
    last_queued_count: 100,
    last_error: null,
    next_run_at: "2026-05-14T14:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-14T14:14:10.000Z"
  },
  {
    id: 5,
    name: "US Investment Banks (AUM 100M–100B)",
    source: "preqin",
    description: null,
    interval_days: 30,
    records_limit: 100,
    crm_age_days: 180,
    enabled: false,
    settings: {
      investorType: ["Investment Bank"],
      location: ["us"],
      aum: { min: 100, max: 100000 }
    },
    last_run_started_at: null,
    last_run_completed_at: null,
    last_run_status: null,
    last_result_count: null,
    last_queued_count: null,
    last_error: null,
    next_run_at: null,
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2025-06-06T00:00:00.000Z"
  },
  // Biscred feeds
  {
    id: 6,
    name: "Data Centers",
    source: "biscred",
    description: "Developers and investors in data center assets",
    interval_days: 1,
    records_limit: 50,
    crm_age_days: 180,
    enabled: true,
    settings: {
      assetClasses: ["Data Center"],
      industries: ["Developer", "Institutional Investor", "Real Estate Investment Firm"]
    },
    last_run_started_at: "2026-04-22T06:00:00.000Z",
    last_run_completed_at: "2026-04-22T06:01:14.000Z",
    last_run_status: "complete",
    last_result_count: 94,
    last_queued_count: 50,
    last_error: null,
    next_run_at: "2026-04-23T06:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-22T06:01:14.000Z"
  },
  {
    id: 7,
    name: "REITs",
    source: "biscred",
    description: "Real estate investment trusts across all asset classes",
    interval_days: 1,
    records_limit: 50,
    crm_age_days: 180,
    enabled: true,
    settings: {
      assetClasses: [],
      industries: ["Real Estate Investment Trust (REIT)"]
    },
    last_run_started_at: "2026-04-22T06:00:01.000Z",
    last_run_completed_at: "2026-04-22T06:01:22.000Z",
    last_run_status: "complete",
    last_result_count: 67,
    last_queued_count: 50,
    last_error: null,
    next_run_at: "2026-04-23T06:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-22T06:01:22.000Z"
  },
  {
    id: 8,
    name: "Affordable Housing Developers",
    source: "biscred",
    description: null,
    interval_days: 1,
    records_limit: 50,
    crm_age_days: 180,
    enabled: true,
    settings: {
      assetClasses: ["Affordable Housing"],
      industries: ["Developer"]
    },
    last_run_started_at: "2026-04-22T06:00:02.000Z",
    last_run_completed_at: null,
    last_run_status: "running",
    last_result_count: null,
    last_queued_count: null,
    last_error: null,
    next_run_at: "2026-04-23T06:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-22T06:00:02.000Z"
  },
  {
    id: 9,
    name: "Industrial Assets",
    source: "biscred",
    description: null,
    interval_days: 1,
    records_limit: 100,
    crm_age_days: 180,
    enabled: true,
    settings: {
      assetClasses: ["Industrial"],
      industries: ["Developer", "Private Equity", "Real Estate Investment Firm"]
    },
    last_run_started_at: "2026-04-21T06:00:00.000Z",
    last_run_completed_at: "2026-04-21T06:02:11.000Z",
    last_run_status: "failed",
    last_result_count: null,
    last_queued_count: null,
    last_error: "Upstream Biscred API returned 429 — rate limit exceeded. Will retry next scheduled run.",
    next_run_at: "2026-04-22T06:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-21T06:02:11.000Z"
  },
  // RevenueBase feeds (new, not yet configured)
  {
    id: 10,
    name: "PE-Backed CFOs (Seed)",
    source: "revenuebase",
    description: "CFOs and finance leaders at PE-backed portfolio companies",
    interval_days: 7,
    records_limit: 200,
    crm_age_days: 90,
    enabled: false,
    settings: {
      jobTitles: ["CFO", "Chief Financial Officer", "VP Finance", "Head of Finance"],
      industries: ["Private Equity", "Financial Services"],
      revenueRange: { min: 10000000, max: 500000000 }
    },
    last_run_started_at: null,
    last_run_completed_at: null,
    last_run_status: null,
    last_result_count: null,
    last_queued_count: null,
    last_error: null,
    next_run_at: null,
    createddate: "2026-04-01T00:00:00.000Z",
    modifieddate: "2026-04-01T00:00:00.000Z"
  }
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a stable summary of all feeds.
 * In production this would call the backend feeds service API.
 * @returns {Promise<object[]>}
 */
export async function loadFeedsList() {
  // TODO: replace with real API call to GET /api/feeds
  return MOCK_FEEDS.map((feed) => ({ ...feed }));
}

/**
 * Returns a single feed by id.
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
export async function loadFeedById(id) {
  const numId = Number(id);
  const feed = MOCK_FEEDS.find((f) => f.id === numId);
  // TODO: replace with real API call to GET /api/feeds/:id
  return feed ? { ...feed } : null;
}

/**
 * Returns a blank feed template for new feed creation.
 * @param {string} [source]
 * @returns {object}
 */
export function buildEmptyFeed(source) {
  return {
    id: null,
    name: "",
    source: source || "",
    description: "",
    interval_days: 7,
    records_limit: 100,
    crm_age_days: 90,
    enabled: true,
    settings: {},
    last_run_started_at: null,
    last_run_completed_at: null,
    last_run_status: null,
    last_result_count: null,
    last_queued_count: null,
    last_error: null,
    next_run_at: null
  };
}

/**
 * Groups a flat feed list by source.
 * @param {object[]} feeds
 * @returns {Record<string, object[]>}
 */
export function groupFeedsBySource(feeds) {
  const groups = {};
  for (const feed of feeds) {
    const key = feed.source || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(feed);
  }
  return groups;
}

/**
 * Returns summary stats across all feeds.
 * @param {object[]} feeds
 * @returns {{total: number, enabled: number, running: number, failed: number}}
 */
export function computeFeedStats(feeds) {
  return {
    total: feeds.length,
    enabled: feeds.filter((f) => f.enabled).length,
    running: feeds.filter((f) => f.last_run_status === "running").length,
    failed: feeds.filter((f) => f.last_run_status === "failed").length
  };
}
