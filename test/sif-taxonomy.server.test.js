const test = require("node:test");
const assert = require("node:assert/strict");

const {
  loadSifTaxonomyDocument,
  saveSifTaxonomyDocument
} = require("../app/models/sif-taxonomy.server");

function createSampleTaxonomyDocument() {
  return {
    schemaVersion: 1,
    documentType: "taxonomy",
    taxonomy: "sif",
    description: "Authoritative Sector / Industry / Focus taxonomy and UI descriptions.",
    generatedAt: "2026-03-27T13:31:04.302Z",
    source: {
      format: "html",
      path: "/Users/dmorgan/steve/Sectors - Industries - Focuses.html"
    },
    intro: {
      title: "Sector, Industry, and Focus Guide",
      paragraphs: ["This guide translates the workbook taxonomy into plain-English business descriptions."],
      sourceBasis: "Source basis: workbook hierarchy."
    },
    stats: {
      sectors: 1,
      industries: 0,
      focuses: 0
    },
    sectors: [
      {
        id: "sector:real-estate",
        kind: "sector",
        label: "Real Estate",
        slug: "real-estate",
        pathLabels: ["Real Estate"],
        description: "Sector description",
        examples: ["apartment owners"],
        whyHere: null,
        aliases: [],
        active: true,
        crosswalkOnly: false,
        seenInCrosswalks: [],
        sortOrder: 1,
        industries: []
      }
    ]
  };
}

test("loadSifTaxonomyDocument loads the authoritative admin data id and normalizes the hierarchical document", async () => {
  const calls = [];
  const loaded = await loadSifTaxonomyDocument({
    request: new Request("http://localhost:3000/admin/segmentation/sectors", {
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
            data: {
              id: "crm.data.taxonomy:sif",
              namespace: "crm.data.taxonomy",
              key: "sif",
              name: "Sector Industry Focus Taxonomy",
              description: "Authoritative Sector / Industry / Focus taxonomy and UI descriptions.",
              version: 4,
              document: createSampleTaxonomyDocument()
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/admin/data/crm.data.taxonomy%3Asif");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.equal(loaded.id, "crm.data.taxonomy:sif");
  assert.equal(loaded.document.taxonomy, "sif");
  assert.equal(loaded.document.sectors[0].label, "Real Estate");
});

test("saveSifTaxonomyDocument writes the raw hierarchical taxonomy document back through the admin data endpoint", async () => {
  const calls = [];
  const saved = await saveSifTaxonomyDocument({
    request: new Request("http://localhost:3000/admin/segmentation/sectors", {
      headers: {
        cookie: "sid=123"
      }
    }),
    expectedVersion: 4,
    description: "Authoritative Sector / Industry / Focus taxonomy and UI descriptions.",
    document: createSampleTaxonomyDocument(),
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            data: {
              id: "crm.data.taxonomy:sif",
              namespace: "crm.data.taxonomy",
              key: "sif",
              name: "Sector Industry Focus Taxonomy",
              description: "Authoritative Sector / Industry / Focus taxonomy and UI descriptions.",
              version: 5,
              status: "active"
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/admin/data/crm.data.taxonomy%3Asif");
  assert.equal(calls[0].options.method, "PUT");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.equal(calls[0].options.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    description: "Authoritative Sector / Industry / Focus taxonomy and UI descriptions.",
    expectedVersion: 4,
    document: createSampleTaxonomyDocument()
  });
  assert.equal(saved.id, "crm.data.taxonomy:sif");
  assert.equal(saved.version, 5);
});

