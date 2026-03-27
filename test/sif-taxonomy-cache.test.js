const test = require("node:test");
const assert = require("node:assert/strict");

const {
  readCachedSifTaxonomy,
  syncSifTaxonomyToCache,
  writeCachedSifTaxonomy
} = require("../app/models/sif-taxonomy-cache");

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
      industries: 1,
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
        industries: [
          {
            id: "industry:real-estate:real-estate-operating-companies",
            kind: "industry",
            sectorId: "sector:real-estate",
            label: "Real Estate Operating Companies",
            slug: "real-estate-operating-companies",
            pathLabels: ["Real Estate", "Real Estate Operating Companies"],
            description: "Industry description",
            examples: ["multifamily owners"],
            whyHere: null,
            aliases: [],
            active: true,
            crosswalkOnly: false,
            seenInCrosswalks: [],
            sortOrder: 1,
            focuses: []
          }
        ]
      }
    ]
  };
}

function createOpenDatabaseDouble() {
  let record = null;

  return {
    async openDatabase() {
      return {
        async get() {
          return record;
        },
        async put(value) {
          record = value;
          return value;
        }
      };
    }
  };
}

test("readCachedSifTaxonomy returns null when the cache has not been populated", async () => {
  const database = createOpenDatabaseDouble();

  const cached = await readCachedSifTaxonomy({
    openDatabase: database.openDatabase
  });

  assert.equal(cached, null);
});

test("writeCachedSifTaxonomy stores one normalized SIF document record", async () => {
  const database = createOpenDatabaseDouble();

  const cached = await writeCachedSifTaxonomy({
    id: "crm.data.taxonomy:sif",
    version: 4,
    document: createSampleTaxonomyDocument(),
    openDatabase: database.openDatabase
  });

  assert.equal(cached.id, "crm.data.taxonomy:sif");
  assert.equal(cached.version, 4);
  assert.equal(cached.document.taxonomy, "sif");
  assert.equal(cached.document.sectors[0].slug, "real-estate");

  const reread = await readCachedSifTaxonomy({
    openDatabase: database.openDatabase
  });
  assert.equal(reread.version, 4);
  assert.equal(reread.document.documentType, "taxonomy");
});

test("syncSifTaxonomyToCache fetches the authoritative admin data document and updates the cache", async () => {
  const database = createOpenDatabaseDouble();
  const calls = [];

  const synced = await syncSifTaxonomyToCache({
    fetchImpl: async (url) => {
      calls.push(String(url));

      return {
        ok: true,
        async json() {
          return {
            data: {
              id: "crm.data.taxonomy:sif",
              description: "Authoritative Sector / Industry / Focus taxonomy and UI descriptions.",
              version: 7,
              document: createSampleTaxonomyDocument()
            }
          };
        }
      };
    },
    openDatabase: database.openDatabase
  });

  assert.deepEqual(calls, ["/api/rest/admin/data/crm.data.taxonomy%3Asif"]);
  assert.equal(synced.version, 7);

  const cached = await readCachedSifTaxonomy({
    openDatabase: database.openDatabase
  });
  assert.equal(cached.version, 7);
  assert.equal(cached.document.taxonomy, "sif");
});

