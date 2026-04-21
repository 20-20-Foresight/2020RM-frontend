const test = require("node:test");
const assert = require("node:assert/strict");

const { AdminDataApiError } = require("../app/models/admin-data.server");
const {
  loadLearnTopicDetail,
  loadLearnTopics
} = require("../app/models/learn.server");

/**
 * Builds one request for Learn loader tests.
 * @returns {Request}
 */
function buildRequest() {
  return new Request("http://localhost:3000/learn", {
    headers: {
      cookie: "sid=123"
    }
  });
}

test("loadLearnTopics filters topics by permission for recruiter personas", async () => {
  const requestedIds = [];
  const topics = await loadLearnTopics({
    request: buildRequest(),
    meta: {
      personas: {
        allowed: ["recruiter"],
        current: "Recruiter"
      },
      permissions: {
        admin_access: {}
      }
    },
    loadRawAdminDataDocument: async ({ id }) => {
      requestedIds.push(id);
      return {
        document: {
          topics: [
            {
              id: "focus",
              title: "Focus",
              summary: "Focus summary",
              slug: "focus",
              categoryDocumentId: "crm.data:focus",
              category: "Segmentation",
              permission: "all"
            },
            {
              id: "industry",
              title: "Industry",
              summary: "Industry summary",
              slug: "industry",
              categoryDocumentId: "crm.data:industry",
              category: "Segmentation",
              permission: "recruiter"
            },
            {
              id: "market-tiers",
              title: "Market Tiers",
              summary: "Market tiers summary",
              slug: "market-tiers",
              categoryDocumentId: "crm.data:market-tiers",
              category: "Market",
              permission: "admin"
            }
          ]
        }
      };
    }
  });

  assert.deepEqual(requestedIds, ["crm.learn:topics"]);
  assert.deepEqual(
    topics.map((topic) => ({
      id: topic.id,
      permission: topic.permission
    })),
    [
      {
        id: "focus",
        permission: "all"
      },
      {
        id: "industry",
        permission: "recruiter"
      }
    ]
  );
});

test("loadLearnTopics returns an empty list when the learn topics config document is not seeded yet", async () => {
  const messages = [];
  const topics = await loadLearnTopics({
    request: buildRequest(),
    meta: {
      permissions: {
        admin_access: {}
      }
    },
    logger: {
      error(message, details) {
        messages.push({ message, details });
      }
    },
    loadRawAdminDataDocument: async () => {
      throw new AdminDataApiError("Document not found.", {
        code: "not_found",
        statusCode: 404
      });
    }
  });

  assert.deepEqual(topics, []);
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /Learn topics document is not available/i);
});

test("loadLearnTopicDetail returns the permitted topic and filters retired category rows", async () => {
  const requestedIds = [];
  const detail = await loadLearnTopicDetail({
    request: buildRequest(),
    slug: "focus",
    meta: {
      personas: {
        current: "Recruiter"
      },
      permissions: {
        admin_access: {}
      }
    },
    loadRawAdminDataDocument: async ({ id }) => {
      requestedIds.push(id);
      if (id === "crm.learn:topics") {
        return {
          document: {
            topics: [
              {
                id: "focus",
                title: "Focus",
                summary: "Focus summary",
                slug: "focus",
                categoryDocumentId: "crm.data:focus",
                category: "Segmentation",
                permission: "all"
              }
            ]
          }
        };
      }

      return {
        document: {
          values: [
            {
              id: "focus-1",
              label: "3rd Party Property Management",
              description: "<p>Trusted HTML description.</p>",
              examples: ["AppFolio", "RealPage"]
            },
            {
              id: "focus-2",
              label: "Retired Category",
              description: "<p>Retired</p>",
              examples: ["Legacy Example"],
              deletedOn: "2026-04-20T10:00:00.000Z"
            }
          ]
        }
      };
    }
  });

  assert.deepEqual(requestedIds, ["crm.learn:topics", "crm.data:focus"]);
  assert.equal(detail.topic.id, "focus");
  assert.deepEqual(detail.categories, [
    {
      id: "focus-1",
      label: "3rd Party Property Management",
      description: "<p>Trusted HTML description.</p>",
      examplesText: "AppFolio\nRealPage",
      dimensionId: "",
      preference: null,
      deletedOn: "",
      __extraFields: {}
    }
  ]);
});

test("loadLearnTopicDetail hides restricted topics from unauthorized users", async () => {
  const detail = await loadLearnTopicDetail({
    request: buildRequest(),
    slug: "market-tiers",
    meta: {
      personas: {
        current: "Recruiter"
      },
      permissions: {
        admin_access: {}
      }
    },
    loadRawAdminDataDocument: async () => ({
      document: {
        topics: [
          {
            id: "market-tiers",
            title: "Market Tiers",
            summary: "Market tiers summary",
            slug: "market-tiers",
            categoryDocumentId: "crm.data:market-tiers",
            category: "Market",
            permission: "admin"
          }
        ]
      }
    })
  });

  assert.equal(detail, null);
});
