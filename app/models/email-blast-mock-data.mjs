/**
 * Mock data + pure helpers for the Email Blast Request / Schedule Email Blast
 * UX prototype. There is no backend for email blasts yet — everything here is
 * self-contained so the two /tools/email-blast-* pages can be built and
 * demoed without any AJAX calls, mirroring how the Services (Jobs) pages
 * shipped ahead of their real data model.
 */

export const POSITION_LEVELS = [
  { key: "c-suite", label: "C-Suite" },
  { key: "svp-evp", label: "SVP / EVP" },
  { key: "vp", label: "VP" },
  { key: "director", label: "Director" },
  { key: "manager", label: "Manager" },
  { key: "individual-contributor", label: "Individual Contributor" },
];

export const DISCIPLINES = [
  { key: "hr", label: "HR" },
  { key: "finance", label: "Finance" },
  { key: "technology", label: "Technology" },
  { key: "operations", label: "Operations" },
  { key: "sales-marketing", label: "Sales & Marketing" },
  { key: "legal", label: "Legal" },
];

export const US_REGIONS = [
  { key: "northeast", label: "Northeast" },
  { key: "mid-atlantic", label: "Mid-Atlantic" },
  { key: "southeast", label: "Southeast" },
  { key: "midwest", label: "Midwest" },
  { key: "southwest", label: "Southwest" },
  { key: "west", label: "West" },
];

export const COMPANY_SIZE_BANDS = [
  { key: "under-500", label: "Under 500 employees" },
  { key: "500-5000", label: "500 – 5,000 employees" },
  { key: "5000-20000", label: "5,000 – 20,000 employees" },
  { key: "over-20000", label: "Over 20,000 employees" },
];

export const COOLDOWN_OPTIONS = [
  { key: "none", label: "No cooldown", hours: 0 },
  { key: "24h", label: "24 hours", hours: 24 },
  { key: "48h", label: "48 hours", hours: 48 },
  { key: "72h", label: "72 hours", hours: 72 },
];

/**
 * Consumer webmail domains covered by the "Exclude personal emails" toggle.
 */
export const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
];

/**
 * Derives the client company's email domain from its primary contact (e.g.
 * "azillig@fallon.com" -> "fallon.com"), so a new blast request's "Always
 * exclude" list can be pre-seeded with "*@{domain}" for whichever company
 * we're actually hiring for — without needing a separate domain field in
 * the services mock data.
 * @param {{primaryContact?: {email?: string}, company?: {name?: string}}|null|undefined} service
 * @returns {string}
 */
export function getClientEmailDomain(service) {
  const contactEmail = service?.primaryContact?.email;
  if (typeof contactEmail === "string" && contactEmail.includes("@")) {
    return contactEmail.split("@")[1].toLowerCase();
  }

  const companyName = service?.company?.name;
  if (typeof companyName === "string" && companyName.trim()) {
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .replace(/^(the|a|an)/, "");
    return slug ? `${slug}.com` : "";
  }

  return "";
}

export const CANNED_AUDIENCE_LISTS = [
  {
    id: "canned-ca-re-executive",
    label: "CA · Real Estate · Executive Search",
    summary: "California candidates, Real Estate discipline, VP and above",
    approxSize: 1180,
  },
  {
    id: "canned-ne-finance-vp",
    label: "Northeast · Finance · VP+",
    summary: "Northeast region, Finance discipline, VP and above",
    approxSize: 940,
  },
  {
    id: "canned-tech-csuite-national",
    label: "National · Technology · C-Suite",
    summary: "All regions, Technology discipline, C-Suite only",
    approxSize: 310,
  },
  {
    id: "canned-hr-directors-midwest",
    label: "Midwest · HR · Director",
    summary: "Midwest region, HR discipline, Director level",
    approxSize: 655,
  },
];

/**
 * Pre-built "email exclusion list" — a new list type discussed on the
 * process-discovery call (Dan: dynamic exclusion lists like "opted out of
 * resume emails" or "got an email in the last 15 days" you don't have to
 * keep up to date manually). Researchers pick as many as apply to a send;
 * there's no cap.
 */
export const MOCK_EMAIL_EXCLUSION_LISTS = [
  {
    id: "excl-do-not-contact",
    label: "Do Not Contact — Global",
    description: "Company-wide do-not-contact registry, maintained by Compliance.",
    count: 342,
  },
  {
    id: "excl-resume-optout",
    label: "Opted Out — Resume Emails",
    description: "Candidates who unsubscribed from resume/candidate-sourcing emails.",
    count: 1875,
  },
  {
    id: "excl-recent-15d",
    label: "Recently Contacted (15 Days)",
    description: "Anyone who received any 20/20 email in the last 15 days — refreshes automatically.",
    count: 2140,
  },
  {
    id: "excl-existing-clients",
    label: "Existing 20/20 Clients",
    description: "Contacts at companies we currently have an active retained search with.",
    count: 615,
  },
  {
    id: "excl-board-conflicts",
    label: "Board & Investor Conflicts",
    description: "Board members and investors flagged as a conflict of interest.",
    count: 88,
  },
  {
    id: "excl-competitor-firms",
    label: "Competitor Firm Contacts",
    description: "Contacts at competing executive search firms.",
    count: 210,
  },
];

/**
 * Ordered status stepper, shaped for direct use with MilestoneChevrons
 * ({key, label, shortLabel}[]).
 */
export const EMAIL_BLAST_STATUSES = [
  { key: "draft", label: "Draft", shortLabel: "DRAFT" },
  { key: "pending-approval", label: "Pending Approval", shortLabel: "PENDING" },
  { key: "approved", label: "Approved", shortLabel: "APPROVED" },
  { key: "scheduled", label: "Scheduled", shortLabel: "SCHEDULED" },
  { key: "sending", label: "Sending", shortLabel: "SENDING" },
  { key: "sent", label: "Sent", shortLabel: "SENT" },
];

export function statusIndex(statusKey) {
  const index = EMAIL_BLAST_STATUSES.findIndex((status) => status.key === statusKey);
  return index === -1 ? 0 : index;
}

/**
 * Returns whether the named person is the client manager on a service —
 * the gate for the Approve Email step.
 * @param {{clientManager?: string}|null|undefined} service
 * @param {string} personName
 * @returns {boolean}
 */
export function isServiceClientManager(service, personName) {
  return Boolean(service?.clientManager) && service.clientManager === personName;
}

export const MOCK_EMAIL_HEADER_SNIPPETS = [
  {
    id: "header-standard",
    label: "Standard 20/20 Header",
    html: '<div style="padding:16px 24px;background:#0F172A;color:#fff;font-family:sans-serif"><strong>20/20 Foresight</strong> &middot; Executive Talent Solutions</div>',
  },
  {
    id: "header-confidential",
    label: "Confidential Search Header",
    html: '<div style="padding:16px 24px;background:#fff;border-bottom:2px solid #D72638;font-family:sans-serif;color:#1A222C"><strong>Confidential Search</strong> &mdash; 20/20 Foresight</div>',
  },
];

export const MOCK_EMAIL_FOOTER_SNIPPETS = [
  {
    id: "footer-standard",
    label: "Standard Footer w/ Unsubscribe",
    html: '<div style="padding:16px 24px;font-family:sans-serif;font-size:12px;color:#6B7280;border-top:1px solid #E5E7EB">20/20 Foresight &middot; Boston, MA &middot; <a href="#">Unsubscribe</a></div>',
  },
  {
    id: "footer-confidential",
    label: "Confidential Search Footer",
    html: '<div style="padding:16px 24px;font-family:sans-serif;font-size:12px;color:#6B7280;border-top:1px solid #E5E7EB">This message concerns a confidential retained search. <a href="#">Unsubscribe</a></div>',
  },
];

/**
 * Static HTML twin of SAMPLE_COMPOSE_DESIGN — same retained-search content,
 * as flat HTML rather than an Unlayer design JSON. Used anywhere we need to
 * render a body preview without a live editor instance mounted (e.g. the
 * Schedule page's read-only request review), since Unlayer only exposes
 * exportHtml() through an actual mounted editor.
 */
export const SAMPLE_COMPOSE_HTML = `
<h2 style="font-size:22px">Senior Vice President, Equity Raising</h2>
<p>We have been retained by a private equity real estate investment firm to recruit a <strong>Senior Vice President, Equity Raising</strong>.</p>
<h3 style="font-size:16px">Role</h3>
<p>The Senior Vice President, Equity Raising will serve as a front-line originator of new equity capital for the Company's private equity real estate platform. This is a senior-level, externally focused role responsible for sourcing, cultivating, and converting net-new relationships with high-net-worth (HNW), ultra-high-net-worth (UHNW), and family office investors to support the Company's investment strategies.</p>
<p>This role is oriented toward new relationship origination rather than stewardship of legacy capital sources, requiring a high-activity, hunter mindset comfortable operating independently in the market while coordinating closely with senior leadership on deployment pacing and portfolio construction.</p>
<h3 style="font-size:16px">Location</h3>
<p>Flexible. Company HQ in New York, NY. Open to locations in other major markets.</p>
`.trim();

/**
 * Starter content for the Compose Email editor so it never opens blank — a
 * retained-search outreach email (Senior Vice President, Equity Raising),
 * the same style of content seen in the real MassMailer email body editor
 * during the process-discovery call. Minimal Unlayer design JSON: only the
 * fields we care about are set, and the editor fills in style defaults for
 * everything else at load time.
 */
export const SAMPLE_COMPOSE_DESIGN = {
  counters: { u_row: 1, u_column: 1, u_content_heading: 3, u_content_text: 3 },
  body: {
    rows: [
      {
        cells: [1],
        columns: [
          {
            contents: [
              {
                type: "heading",
                values: { text: "Senior Vice President, Equity Raising", headingType: "h2", fontSize: "22px", textAlign: "left" },
              },
              {
                type: "text",
                values: {
                  text: "<p>We have been retained by a private equity real estate investment firm to recruit a <strong>Senior Vice President, Equity Raising</strong>.</p>",
                },
              },
              {
                type: "heading",
                values: { text: "Role", headingType: "h3", fontSize: "16px", textAlign: "left" },
              },
              {
                type: "text",
                values: {
                  text: "<p>The Senior Vice President, Equity Raising will serve as a front-line originator of new equity capital for the Company's private equity real estate platform. This is a senior-level, externally focused role responsible for sourcing, cultivating, and converting net-new relationships with high-net-worth (HNW), ultra-high-net-worth (UHNW), and family office investors to support the Company's investment strategies.</p><p>This role is oriented toward new relationship origination rather than stewardship of legacy capital sources, requiring a high-activity, hunter mindset comfortable operating independently in the market while coordinating closely with senior leadership on deployment pacing and portfolio construction.</p>",
                },
              },
              {
                type: "heading",
                values: { text: "Location", headingType: "h3", fontSize: "16px", textAlign: "left" },
              },
              {
                type: "text",
                values: { text: "<p>Flexible. Company HQ in New York, NY. Open to locations in other major markets.</p>" },
              },
            ],
            values: {},
          },
        ],
        values: {},
      },
    ],
    values: { backgroundColor: "#FFFFFF", contentWidth: "600px" },
  },
};

/**
 * Builds a minimal single-text-block Unlayer design from a recruiter's plain
 * rich-text body (captured by the simplified Email Blast Request compose
 * step) so the Schedule page's full editor opens with that text already in
 * place as a starting point for the marketing/research team to build on,
 * instead of always loading the generic SAMPLE_COMPOSE_DESIGN placeholder.
 */
export function buildDesignFromBodyHtml(bodyHtml) {
  const text =
    bodyHtml && bodyHtml.trim()
      ? bodyHtml
      : "<p>The recruiter has not yet added body text for this request.</p>";
  return {
    counters: { u_row: 1, u_column: 1, u_content_text: 1 },
    body: {
      rows: [
        {
          cells: [1],
          columns: [
            {
              contents: [
                {
                  type: "text",
                  values: { text },
                },
              ],
              values: {},
            },
          ],
          values: {},
        },
      ],
      values: { backgroundColor: "#FFFFFF", contentWidth: "600px" },
    },
  };
}

export const MOCK_EMAIL_STARTER_TEMPLATES = [
  {
    id: "starter-cfo-search",
    label: "CFO / Finance Executive Search",
    subject: "A confidential opportunity for a Finance leader",
    previewText:
      "We've been retained to identify a Chief Financial Officer for a growth-stage company...",
    bodyHtml:
      '<h2 style="font-size:22px">Chief Financial Officer</h2><p>We have been retained by a growth-stage company to recruit a <strong>Chief Financial Officer</strong>, and your background stood out right away.</p><h3 style="font-size:16px">Role</h3><p>The Chief Financial Officer will serve as a strategic partner to the CEO and board, overseeing financial planning, capital strategy, and reporting as the business scales. This is a senior-level role for someone equally comfortable in the boardroom and in the detail of the numbers.</p><h3 style="font-size:16px">Location</h3><p>Flexible, with a preference for candidates able to travel to the company\'s headquarters periodically.</p>',
  },
  {
    id: "starter-general-es-outreach",
    label: "General Executive Search Outreach",
    subject: "A search you may want to hear about",
    previewText:
      "We're conducting a confidential retained search and thought of your background...",
    bodyHtml:
      '<h2 style="font-size:22px">A Confidential Search Opportunity</h2><p>We are conducting a confidential retained search on behalf of a well-regarded client, and your background came up right away as a strong fit.</p><h3 style="font-size:16px">Role</h3><p>This is a senior leadership position with broad scope and visibility, suited to someone with a track record of building teams and driving results in a similar industry.</p><h3 style="font-size:16px">Location</h3><p>Flexible. Further details available once we\'ve had a chance to speak.</p>',
  },
  {
    id: "starter-completed-search",
    label: "Completed Search Announcement",
    subject: "We're pleased to announce a recent placement",
    previewText: "20/20 Foresight is pleased to share the successful completion of...",
    bodyHtml:
      '<h2 style="font-size:22px">A Recent Placement</h2><p>20/20 Foresight is pleased to share the successful completion of a retained search on behalf of our client.</p><h3 style="font-size:16px">The Search</h3><p>Over the course of this engagement, we ran a thorough, confidential process to identify a leader who could step in and make an immediate impact. We\'re grateful to everyone who took the time to speak with us along the way.</p><h3 style="font-size:16px">Looking Ahead</h3><p>We look forward to continuing to work with our network on future opportunities like this one.</p>',
  },
];

/**
 * Deterministic, responsive-feeling audience estimate for the targeting
 * filter builder. There's no real database behind this yet, so this
 * simulates "the count changes as you narrow the filters" without pretending
 * to hit an API.
 * @param {{positionLevels?: string[], disciplines?: string[], regions?: string[], companySizeBands?: string[]}} filters
 * @returns {number}
 */
export function estimateAudienceSize(filters = {}) {
  const BASE_POOL = 48000;
  const positionLevels = Array.isArray(filters.positionLevels) ? filters.positionLevels : [];
  const disciplines = Array.isArray(filters.disciplines) ? filters.disciplines : [];
  const regions = Array.isArray(filters.regions) ? filters.regions : [];
  const companySizeBands = Array.isArray(filters.companySizeBands) ? filters.companySizeBands : [];

  const positionFactor = positionLevels.length
    ? positionLevels.length / POSITION_LEVELS.length
    : 1;
  const disciplineFactor = disciplines.length ? disciplines.length / DISCIPLINES.length : 1;
  const regionFactor = regions.length ? regions.length / US_REGIONS.length : 1;
  const sizeFactor = companySizeBands.length
    ? companySizeBands.length / COMPANY_SIZE_BANDS.length
    : 1;

  const narrowed = BASE_POOL * positionFactor * disciplineFactor * regionFactor * sizeFactor;

  // A pinch of non-linearity so stacking filters feels like real targeting
  // rather than a flat multiply — matches how narrow segments compound.
  const compounded = narrowed * (0.55 + 0.45 * positionFactor * disciplineFactor);

  return Math.max(0, Math.round(compounded));
}

const PREVIEW_FIRST_NAMES = [
  "James", "Maria", "Robert", "Linda", "Michael", "Patricia", "David", "Susan", "Richard", "Jessica",
  "Charles", "Karen", "Thomas", "Nancy", "Daniel", "Emily", "Matthew", "Sandra", "Anthony", "Rachel",
];
const PREVIEW_LAST_NAMES = [
  "Whitfield", "Nguyen", "Torres", "Patel", "Sullivan", "Okafor", "Bennett", "Kowalski", "Reyes", "Marsh",
  "Donnelly", "Iverson", "Castillo", "Pruitt", "Langford", "Beaumont", "Chen", "Delgado", "Winslow", "Ferraro",
];
const PREVIEW_TITLES = [
  "Chief Financial Officer", "VP of Finance", "Controller", "SVP Operations", "VP of Human Resources",
  "Chief Technology Officer", "VP of Sales", "Director of Finance", "EVP Strategy", "VP of Marketing",
];
const PREVIEW_COMPANIES = [
  "Meridian Health Systems", "Beacon Capital", "Northeast Health", "Global Logic", "Harrington Group",
  "Atlantic Partners", "Vantage Point Partners", "Cascade Industries", "Redwood Capital", "Sterling Group",
];

/**
 * Tiny deterministic string hash + PRNG so mock people are stable across
 * renders/pages without storing thousands of records in memory.
 * @param {string} value
 * @returns {number}
 */
function hashSeed(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickFrom(pool, seed) {
  return pool[seed % pool.length];
}

/**
 * Builds one deterministic mock person for a given canned list + index.
 * @param {string} listId
 * @param {number} index
 * @returns {{id: string, name: string, title: string, company: string, email: string}}
 */
function buildMockPerson(listId, index) {
  const seed = hashSeed(`${listId}-${index}`);
  const firstName = pickFrom(PREVIEW_FIRST_NAMES, seed);
  const lastName = pickFrom(PREVIEW_LAST_NAMES, Math.floor(seed / 7));
  const title = pickFrom(PREVIEW_TITLES, Math.floor(seed / 13));
  const company = pickFrom(PREVIEW_COMPANIES, Math.floor(seed / 29));
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")}.com`;

  return {
    id: `${listId}-p${index}`,
    name: `${firstName} ${lastName}`,
    title,
    company,
    email,
  };
}

/**
 * Returns one page of deterministic mock people for a canned audience list,
 * without generating/storing the full (possibly thousands-strong) list.
 * @param {string} listId
 * @param {number} [page] zero-based page index
 * @param {number} [pageSize]
 * @returns {{people: Array<{id:string,name:string,title:string,company:string,email:string}>, total: number, page: number, pageSize: number, totalPages: number}}
 */
export function getCannedListPage(listId, page = 0, pageSize = 25) {
  const list = CANNED_AUDIENCE_LISTS.find((entry) => entry.id === listId);
  const total = list?.approxSize || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * pageSize;
  const end = Math.min(start + pageSize, total);
  const people = [];

  for (let i = start; i < end; i++) {
    people.push(buildMockPerson(listId, i));
  }

  return { people, total, page: safePage, pageSize, totalPages };
}

/**
 * Returns one page of deterministic mock people for a custom targeting query
 * — same idea as getCannedListPage, but seeded from the filter combination
 * itself (via estimateAudienceSize for the total, and the filter signature
 * for the per-person seed) so changing filters visibly changes the preview.
 * @param {{positionLevels?: string[], disciplines?: string[], regions?: string[], companySizeBands?: string[]}} filters
 * @param {number} [page]
 * @param {number} [pageSize]
 * @returns {{people: Array<{id:string,name:string,title:string,company:string,email:string}>, total: number, page: number, pageSize: number, totalPages: number}}
 */
export function getCustomQueryPage(filters, page = 0, pageSize = 25) {
  const total = estimateAudienceSize(filters);
  const signature = JSON.stringify({
    positionLevels: [...(filters?.positionLevels || [])].sort(),
    disciplines: [...(filters?.disciplines || [])].sort(),
    regions: [...(filters?.regions || [])].sort(),
    companySizeBands: [...(filters?.companySizeBands || [])].sort(),
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * pageSize;
  const end = Math.min(start + pageSize, total);
  const people = [];

  for (let i = start; i < end; i++) {
    people.push(buildMockPerson(`custom-${signature}`, i));
  }

  return { people, total, page: safePage, pageSize, totalPages };
}

/**
 * Returns one page of deterministic mock people for a specific send chunk,
 * seeded by the chunk's own id so each chunk gets a stable, distinct slice
 * of people sized to its own estimatedSize (not the whole request's audience).
 * @param {{id: string, estimatedSize: number}} chunk
 * @param {number} [page]
 * @param {number} [pageSize]
 * @returns {{people: Array<{id:string,name:string,title:string,company:string,email:string}>, total: number, page: number, pageSize: number, totalPages: number}}
 */
export function getChunkPeoplePage(chunk, page = 0, pageSize = 25) {
  const total = chunk?.estimatedSize || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * pageSize;
  const end = Math.min(start + pageSize, total);
  const people = [];

  for (let i = start; i < end; i++) {
    people.push(buildMockPerson(`chunk-${chunk.id}`, i));
  }

  return { people, total, page: safePage, pageSize, totalPages };
}

const SEND_STATUS_CYCLE_FOR_COMPLETED = ["Delivered", "Delivered", "Opened", "Opened", "Clicked", "Bounced"];

/**
 * Deterministically derives a per-person send status from a chunk's own
 * lifecycle status — lets the recipient table show "the status of the send"
 * for each person without persisting per-person delivery data anywhere.
 * @param {"scheduled"|"queued"|"processing"|"completed"} chunkStatus
 * @param {number} personIndex
 * @returns {string}
 */
export function derivePersonSendStatus(chunkStatus, personIndex) {
  if (chunkStatus === "completed") {
    return SEND_STATUS_CYCLE_FOR_COMPLETED[personIndex % SEND_STATUS_CYCLE_FOR_COMPLETED.length];
  }
  if (chunkStatus === "processing") {
    return personIndex % 3 === 0 ? "Delivered" : "Sending";
  }
  if (chunkStatus === "queued") {
    return "Queued";
  }
  return "Not sent yet";
}

const NOW = new Date("2026-07-08T09:00:00-05:00");

function daysFromNow(days) {
  const date = new Date(NOW);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export const MOCK_EMAIL_BLAST_REQUESTS = [
  {
    id: "blast-req-001",
    serviceId: "es-003",
    requestedBy: "Jamie L.",
    requestedAt: daysFromNow(-1),
    audienceSource: {
      type: "canned",
      cannedListId: "canned-tech-csuite-national",
    },
    estimatedAudienceSize: 310,
    exclusions: {
      cooldownHours: 0,
      permanentExcludes: ["*@pacificventures.com"],
      excludePersonalEmails: true,
      excludeWorkEmails: false,
      excludedPeople: [],
      exclusionListIds: [],
    },
    email: {
      subject: "A confidential opportunity for a Chief Marketing Officer",
      previewText: "We've been retained to identify a CMO for a growth-stage company...",
      starterTemplateId: "starter-general-es-outreach",
      headerSnippetId: "header-standard",
      footerSnippetId: "footer-standard",
      bodyHtml:
        "<p>We've been retained to identify a Chief Marketing Officer for a growth-stage technology company, and your background stood out right away.</p><p>This is a confidential search — would you be open to a brief call to learn more?</p>",
    },
    notes: "",
    approverFeedback: null,
    approver: "Tom B.",
    status: "pending-approval",
    scheduledDate: null,
    snapshotFrozenAt: null,
  },
  {
    id: "blast-req-002",
    serviceId: "es-002",
    requestedBy: "Tom B.",
    requestedAt: daysFromNow(-2),
    audienceSource: {
      type: "query",
      filters: {
        positionLevels: ["vp", "svp-evp"],
        disciplines: ["finance"],
        regions: ["midwest"],
        companySizeBands: ["500-5000", "5000-20000"],
      },
    },
    estimatedAudienceSize: 1420,
    exclusions: {
      cooldownHours: 24,
      permanentExcludes: ["board-conflict@meridian.org"],
      excludePersonalEmails: true,
      excludeWorkEmails: true,
      excludedPeople: [],
      exclusionListIds: ["excl-recent-15d", "excl-existing-clients"],
    },
    email: {
      subject: "A search you may want to hear about",
      previewText: "We're conducting a confidential retained search and thought of your background...",
      starterTemplateId: "starter-general-es-outreach",
      headerSnippetId: "header-standard",
      footerSnippetId: "footer-standard",
      bodyHtml:
        "<p>We're conducting a confidential retained search for a senior Finance leader with a Midwest-based client, and your background came up as a strong fit.</p><p>Given the client's ask to keep this low-key, I wanted to reach out directly before it goes any further — open to a quick call?</p>",
    },
    notes: "Please keep this one low-key — client asked us not to over-market the role.",
    approverFeedback: null,
    approver: "Sarah K.",
    status: "scheduled",
    scheduledDate: daysFromNow(3),
    snapshotFrozenAt: `${daysFromNow(-2)}T14:32:00-05:00`,
  },
  {
    id: "blast-req-003",
    serviceId: "es-001",
    requestedBy: "Sarah K.",
    requestedAt: daysFromNow(-4),
    audienceSource: {
      type: "canned",
      cannedListId: "canned-ne-finance-vp",
    },
    estimatedAudienceSize: 940,
    exclusions: {
      cooldownHours: 48,
      permanentExcludes: [],
      excludePersonalEmails: true,
      excludeWorkEmails: true,
      excludedPeople: [],
      exclusionListIds: [],
    },
    email: {
      subject: "A confidential opportunity for a Finance leader",
      previewText:
        "We've been retained to identify a Chief Financial Officer for a growth-stage company...",
      starterTemplateId: "starter-cfo-search",
      headerSnippetId: "header-confidential",
      footerSnippetId: "footer-confidential",
      bodyHtml:
        "<p>We've been retained to identify a Chief Financial Officer for a growth-stage company in the Northeast, and we thought of your background right away.</p><p>This is a confidential search. Would you be open to a brief call to learn more?</p>",
    },
    notes: "",
    approverFeedback: null,
    approver: "Dan M.",
    status: "scheduled",
    scheduledDate: daysFromNow(1),
    snapshotFrozenAt: `${daysFromNow(-3)}T10:05:00-05:00`,
  },
  {
    id: "blast-req-004",
    serviceId: "es-004",
    requestedBy: "Sarah K.",
    requestedAt: daysFromNow(-6),
    audienceSource: {
      type: "query",
      filters: {
        positionLevels: ["c-suite"],
        disciplines: ["technology", "operations"],
        regions: ["southwest"],
        companySizeBands: ["under-500", "500-5000"],
      },
    },
    estimatedAudienceSize: 205,
    exclusions: {
      cooldownHours: 24,
      permanentExcludes: [],
      excludePersonalEmails: true,
      excludeWorkEmails: true,
      excludedPeople: [],
      exclusionListIds: [],
    },
    email: {
      subject: "A search you may want to hear about",
      previewText: "We're conducting a confidential retained search and thought of your background...",
      starterTemplateId: "starter-general-es-outreach",
      headerSnippetId: "header-standard",
      footerSnippetId: "footer-standard",
      bodyHtml:
        "<p>We're conducting a confidential retained search for a C-suite Technology or Operations leader with a Southwest-based client, and thought of your background right away.</p><p>I'd welcome the chance to share more if you're open to a conversation.</p>",
    },
    notes: "",
    approverFeedback: null,
    approver: "Tom B.",
    status: "sent",
    scheduledDate: daysFromNow(-5),
    snapshotFrozenAt: `${daysFromNow(-6)}T09:15:00-05:00`,
  },
  {
    id: "blast-req-005",
    serviceId: "es-005",
    requestedBy: "Tom B.",
    requestedAt: daysFromNow(-7),
    audienceSource: {
      type: "canned",
      cannedListId: "canned-hr-directors-midwest",
    },
    estimatedAudienceSize: 655,
    exclusions: {
      cooldownHours: 0,
      permanentExcludes: [],
      excludePersonalEmails: true,
      excludeWorkEmails: false,
      excludedPeople: [],
      exclusionListIds: [],
    },
    email: {
      subject: "We're pleased to announce a recent placement",
      previewText: "20/20 Foresight is pleased to share the successful completion of...",
      starterTemplateId: "starter-completed-search",
      headerSnippetId: "header-standard",
      footerSnippetId: "footer-standard",
      bodyHtml:
        "<p>20/20 Foresight is pleased to share the successful completion of a search for a Head of Human Resources with a Midwest-based client.</p><p>Thank you to everyone who was part of the process — we look forward to working with you again.</p>",
    },
    notes: "",
    approverFeedback: null,
    approver: "Dan M.",
    status: "sent",
    scheduledDate: daysFromNow(-6),
    snapshotFrozenAt: `${daysFromNow(-7)}T08:40:00-05:00`,
  },
];

/**
 * Dimensions a request's audience can be split into send chunks by, reusing
 * the same option lists as the targeting filter builder.
 */
export const SPLIT_DIMENSIONS = [
  { key: "positionLevels", label: "Position Level", options: POSITION_LEVELS },
  { key: "disciplines", label: "Discipline", options: DISCIPLINES },
  { key: "regions", label: "Region", options: US_REGIONS },
  { key: "companySizeBands", label: "Company Size", options: COMPANY_SIZE_BANDS },
];

export const US_STATES_AND_PROVINCES = [
  { key: "ma", label: "Massachusetts" },
  { key: "ny", label: "New York" },
  { key: "ca", label: "California" },
  { key: "il", label: "Illinois" },
  { key: "tx", label: "Texas" },
  { key: "fl", label: "Florida" },
  { key: "wa", label: "Washington" },
  { key: "ga", label: "Georgia" },
  { key: "pa", label: "Pennsylvania" },
  { key: "nc", label: "North Carolina" },
  { key: "on", label: "Ontario" },
  { key: "bc", label: "British Columbia" },
];

/**
 * Broad industry sector — stand-in for the org-classification taxonomy a
 * real backend would supply (see this app's Resegmentation tool).
 */
export const SECTORS = [
  { key: "real-estate", label: "Real Estate" },
  { key: "healthcare", label: "Healthcare" },
  { key: "financial-services", label: "Financial Services" },
  { key: "technology", label: "Technology" },
  { key: "industrial", label: "Industrial & Manufacturing" },
  { key: "consumer-retail", label: "Consumer & Retail" },
  { key: "energy", label: "Energy" },
];

/** Narrower sub-industry within a sector — also stand-in data. */
export const VERTICALS = [
  { key: "private-equity", label: "Private Equity" },
  { key: "reit", label: "REIT" },
  { key: "investment-banking", label: "Investment Banking" },
  { key: "saas", label: "SaaS" },
  { key: "biotech", label: "Biotech" },
  { key: "ecommerce", label: "E-commerce" },
  { key: "insurance", label: "Insurance" },
];

/** Freeform-feeling tags, presented as a picklist per the ask — stand-in data. */
export const KEYWORDS = [
  { key: "turnaround", label: "Turnaround" },
  { key: "family-office", label: "Family Office" },
  { key: "public-company", label: "Public Company" },
  { key: "pe-backed", label: "PE-Backed" },
  { key: "founder-led", label: "Founder-Led" },
  { key: "high-growth", label: "High Growth" },
  { key: "distressed", label: "Distressed" },
  { key: "cross-border", label: "Cross-Border" },
];

/**
 * The dimensions a send chunk can be split by. Position Level/Department
 * reuse the same option lists as the targeting filter builder; State/
 * Province, Sector, Vertical, and Keywords are stand-in "backend doc" lists
 * (a real build would source these from org-classification data). "Total
 * Numbers" has no option list — it splits by a flat batch size instead.
 */
export const CHUNK_SPLIT_TYPES = [
  { key: "position-level", label: "Position Level", options: POSITION_LEVELS },
  { key: "state-province", label: "State/Province", options: US_STATES_AND_PROVINCES },
  { key: "sector", label: "Sector", options: SECTORS },
  { key: "vertical", label: "Vertical", options: VERTICALS },
  { key: "keywords", label: "Keywords", options: KEYWORDS },
  { key: "department", label: "Department", options: DISCIPLINES },
  { key: "total-numbers", label: "Total Numbers", options: null },
];

/**
 * Splits one chunk into exactly two new chunks by a chosen dimension:
 * everything matching the selected values becomes the first chunk,
 * everything else becomes the second. Sized proportionally to how much of
 * the dimension's value space was selected (there's no real per-person
 * attribute data behind this mock, so the split is a reasonable proxy).
 * @param {{label: string, estimatedSize: number}} chunk
 * @param {string} splitTypeKey one of CHUNK_SPLIT_TYPES' keys (not "total-numbers")
 * @param {string[]} selectedValueKeys
 * @returns {[{label: string, estimatedSize: number, status: "scheduled", scheduledAt: null}, {label: string, estimatedSize: number, status: "scheduled", scheduledAt: null}]}
 */
export function splitChunkByValues(chunk, splitTypeKey, selectedValueKeys) {
  const splitType = CHUNK_SPLIT_TYPES.find((entry) => entry.key === splitTypeKey);
  const options = splitType?.options || [];
  const total = chunk.estimatedSize;
  const selectedCount = selectedValueKeys.length;
  const firstSize = options.length ? Math.round(total * (selectedCount / options.length)) : 0;
  const secondSize = total - firstSize;

  const labelFor = (keys) => keys.map((key) => options.find((option) => option.key === key)?.label || key);
  const remainingKeys = options.map((option) => option.key).filter((key) => !selectedValueKeys.includes(key));
  const selectedLabel = labelFor(selectedValueKeys).join(", ");
  const remainingLabel = remainingKeys.length > 2 ? "Everything else" : labelFor(remainingKeys).join(", ");

  return [
    {
      label: `${chunk.label} — ${splitType?.label}: ${selectedLabel}`,
      estimatedSize: firstSize,
      status: "scheduled",
      scheduledAt: null,
    },
    {
      label: `${chunk.label} — ${splitType?.label}: ${remainingLabel}`,
      estimatedSize: secondSize,
      status: "scheduled",
      scheduledAt: null,
    },
  ];
}

/**
 * Splits one chunk into ceil(total/batchSize) chunks of batchSize each, with
 * a smaller final chunk if it doesn't divide evenly — e.g. a chunk of 4,343
 * with a batch size of 500 becomes eight 500-size chunks plus one 343-size
 * chunk.
 * @param {{label: string, estimatedSize: number}} chunk
 * @param {number} batchSize
 * @returns {Array<{label: string, estimatedSize: number, status: "scheduled", scheduledAt: null}>}
 */
export function splitChunkByCount(chunk, batchSize) {
  const total = chunk.estimatedSize;
  const size = Math.max(1, Math.floor(batchSize));
  const fullChunkCount = Math.floor(total / size);
  const remainder = total - fullChunkCount * size;
  const results = [];

  for (let i = 0; i < fullChunkCount; i++) {
    results.push({ label: `${chunk.label} — Batch ${i + 1}`, estimatedSize: size, status: "scheduled", scheduledAt: null });
  }
  if (remainder > 0) {
    results.push({
      label: `${chunk.label} — Batch ${fullChunkCount + 1}`,
      estimatedSize: remainder,
      status: "scheduled",
      scheduledAt: null,
    });
  }

  return results;
}

/**
 * Ordered send-chunk lifecycle, matching the calendar's color coding below.
 */
export const CHUNK_STATUSES = [
  { key: "scheduled", label: "Scheduled" },
  { key: "queued", label: "Queued" },
  { key: "processing", label: "Processing" },
  { key: "completed", label: "Completed" },
];

/**
 * Calendar color coding for send chunks — a deliberate homage to the
 * yellow → purple → red scheme described for the original Outlook calendar
 * on the process-discovery call ("yellow needs a list... purple... Ashley's
 * final check... then it's red"). Kept separate from StatusPill's tone
 * vocabulary, which already uses red for "critical/error" — reusing that
 * for "sent" would clash with the rest of the app.
 */
export const CHUNK_STATUS_COLORS = {
  scheduled: "gray.400",
  queued: "yellow.400",
  processing: "purple.400",
  completed: "red.500",
};

export const MOCK_SEND_CHUNKS = [
  {
    id: "chunk-001",
    requestId: "blast-req-002",
    label: "VP",
    estimatedSize: 780,
    order: 0,
    status: "scheduled",
    scheduledAt: `${daysFromNow(3)}T09:00:00-05:00`,
  },
  {
    id: "chunk-002",
    requestId: "blast-req-002",
    label: "SVP / EVP",
    estimatedSize: 640,
    order: 1,
    status: "scheduled",
    scheduledAt: `${daysFromNow(3)}T10:30:00-05:00`,
  },
  {
    id: "chunk-003",
    requestId: "blast-req-003",
    label: "Batch 1",
    estimatedSize: 470,
    order: 0,
    status: "scheduled",
    scheduledAt: `${daysFromNow(1)}T09:00:00-05:00`,
  },
  {
    id: "chunk-004",
    requestId: "blast-req-003",
    label: "Batch 2",
    estimatedSize: 470,
    order: 1,
    status: "scheduled",
    scheduledAt: `${daysFromNow(1)}T09:30:00-05:00`,
  },
  // Demo-only seed data below: these two requests are already "sent" overall
  // (see MOCK_EMAIL_BLAST_REQUESTS), so their chunks are dated this Monday
  // and marked completed — just to show that color on the calendar.
  {
    id: "chunk-005",
    requestId: "blast-req-004",
    label: "CMO Blast",
    estimatedSize: 205,
    order: 0,
    status: "completed",
    scheduledAt: `${daysFromNow(-2)}T09:00:00-05:00`,
  },
  {
    id: "chunk-006",
    requestId: "blast-req-005",
    label: "HR Directors",
    estimatedSize: 655,
    order: 0,
    status: "completed",
    scheduledAt: `${daysFromNow(-2)}T10:00:00-05:00`,
  },
  // Demo-only: shows the "queued" and "processing" colors against a request
  // that's really still pending-approval — purely so all four colors are
  // visible on the calendar without waiting for a real send cycle.
  {
    id: "chunk-007",
    requestId: "blast-req-001",
    label: "National C-Suite (1 of 2)",
    estimatedSize: 160,
    order: 0,
    status: "queued",
    scheduledAt: `${daysFromNow(0)}T08:00:00-05:00`,
  },
  {
    id: "chunk-008",
    requestId: "blast-req-001",
    label: "National C-Suite (2 of 2)",
    estimatedSize: 150,
    order: 1,
    status: "processing",
    scheduledAt: `${daysFromNow(0)}T11:00:00-05:00`,
  },
];

export const MOCK_SEND_QUEUE_BATCHES = [
  { id: "batch-101", requestId: "blast-req-004", status: "Completed", recordCount: 205, submittedAt: `${daysFromNow(-5)}T09:20:00-05:00` },
  { id: "batch-100", requestId: "blast-req-005", status: "Completed", recordCount: 655, submittedAt: `${daysFromNow(-6)}T09:00:00-05:00` },
  { id: "batch-102", requestId: "blast-req-003", status: "Queued", recordCount: 940, submittedAt: `${daysFromNow(1)}T07:00:00-05:00` },
  { id: "batch-103", requestId: "blast-req-002", status: "Queued", recordCount: 1420, submittedAt: `${daysFromNow(3)}T07:00:00-05:00` },
];
