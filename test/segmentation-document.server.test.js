const test = require("node:test");
const assert = require("node:assert/strict");

const { loadSegmentationDocuments } = require("../app/models/segmentation-document.server");

test("loadSegmentationDocuments requests segmentation admin data for the crosswalks page", async () => {
  const calls = [];
  const items = await loadSegmentationDocuments({
    request: new Request("http://localhost:3000/admin/segmentation/crosswalks", {
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
                namespace: "crm.data.segmentation",
                key: "real-estate-crosswalk",
                name: "Real Estate Crosswalk"
              }
            ]
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/admin/data?namespacePrefix=crm.data&filter.type=segmentation");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.deepEqual(items, [
    {
      id: "crm.data.segmentation:real-estate-crosswalk",
      namespace: "crm.data.segmentation",
      key: "real-estate-crosswalk",
      name: "Real Estate Crosswalk",
      description: "",
      shape: null,
      version: null,
      lastmodifieddate: null,
      lastmodifiedby: null,
      status: null
    }
  ]);
});
