const { loadFeedsList, computeFeedStats } = require("./feeds.server");

const SOURCE_FEED_SOURCES = ["preqin", "biscred", "revenuebase"];
const QUERY_FEED_SOURCES = ["salesforce"];

function normalizeSourceKey(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

function filterFeedsBySourceType(feeds = [], allowedSources = []) {
  const allowed = new Set(
    (Array.isArray(allowedSources) ? allowedSources : [])
      .map((source) => normalizeSourceKey(source))
      .filter(Boolean)
  );

  return feeds.filter((feed) => allowed.has(normalizeSourceKey(feed?.source)));
}

function getCompanyResearchFeedTabPath(source) {
  return "/tools/company-research/feeds";
}

async function loadCompanyResearchFeeds(options = {}) {
  const feeds = await loadFeedsList({
    request: options.request,
    fetchImpl: options.fetchImpl,
  });

  const sourceType = normalizeSourceKey(options.sourceType);
  const filteredFeeds =
    sourceType === "query"
      ? filterFeedsBySourceType(feeds, QUERY_FEED_SOURCES)
      : sourceType === "source"
        ? filterFeedsBySourceType(feeds, SOURCE_FEED_SOURCES)
        : feeds;

  return {
    feeds: filteredFeeds,
    stats: computeFeedStats(filteredFeeds),
  };
}

module.exports = {
  QUERY_FEED_SOURCES,
  SOURCE_FEED_SOURCES,
  getCompanyResearchFeedTabPath,
  loadCompanyResearchFeeds,
};
