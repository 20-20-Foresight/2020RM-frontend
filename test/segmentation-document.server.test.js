const test = require("node:test");
const assert = require("node:assert/strict");

const { loadSegmentationDocuments } = require("../app/models/segmentation-document.server");

test("loadSegmentationDocuments requests taxonomy admin data for the segmentation landing page", async () => {
  const calls = [];
  const items = await loadSegmentationDocuments({
    request: new Request("http://localhost:3000/admin/segmentation", {
      headers: {
        cookie: "sid=123"
      }
    }),
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            items: [
              {
                namespace: "crm.data.taxonomy",
                key: "sif",
                name: "SIF Taxonomy"
              }
            ]
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/admin/data?namespacePrefix=crm.data&filter.type=taxonomy");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.deepEqual(items, [
    {
      id: "crm.data.taxonomy:sif",
      namespace: "crm.data.taxonomy",
      key: "sif",
      name: "SIF Taxonomy",
      description: "",
      shape: null,
      version: null,
      lastmodifieddate: null,
      lastmodifiedby: null,
      status: null
    }
  ]);
});
