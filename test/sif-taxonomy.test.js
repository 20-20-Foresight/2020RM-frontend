const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SIF_TAXONOMY_DATA_ID,
  addSifTaxonomyNode,
  buildSegmentationPath,
  normalizeSifTaxonomyDocument,
  updateSifTaxonomyNode
} = require("../app/models/sif-taxonomy");

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
      focuses: 1
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
            focuses: [
              {
                id: "focus:real-estate:real-estate-operating-companies:reit",
                kind: "focus",
                sectorId: "sector:real-estate",
                industryId: "industry:real-estate:real-estate-operating-companies",
                label: "REIT",
                slug: "reit",
                pathLabels: ["Real Estate", "Real Estate Operating Companies", "REIT"],
                description: "Focus description",
                examples: ["listed REITs"],
                whyHere: "Why REIT sits here.",
                aliases: [],
                active: true,
                crosswalkOnly: false,
                seenInCrosswalks: ["crunchbase"],
                sortOrder: 1
              }
            ]
          }
        ]
      }
    ]
  };
}

test("SIF taxonomy constants and route builders follow the backend design contract", () => {
  assert.equal(SIF_TAXONOMY_DATA_ID, "crm.data.taxonomy:sif");
  assert.equal(buildSegmentationPath("index"), "/admin/segmentation");
  assert.equal(buildSegmentationPath("sectors"), "/admin/segmentation/sectors");
  assert.equal(
    buildSegmentationPath("industries", {
      sectorSlug: "real-estate"
    }),
    "/admin/segmentation/real-estate/industries"
  );
  assert.equal(
    buildSegmentationPath("focuses", {
      sectorSlug: "real-estate",
      industrySlug: "real-estate-operating-companies"
    }),
    "/admin/segmentation/real-estate/real-estate-operating-companies/focuses"
  );
});

test("normalizeSifTaxonomyDocument preserves the hierarchical backend shape", () => {
  const normalized = normalizeSifTaxonomyDocument(createSampleTaxonomyDocument());

  assert.equal(normalized.documentType, "taxonomy");
  assert.equal(normalized.taxonomy, "sif");
  assert.equal(normalized.sectors.length, 1);
  assert.equal(normalized.sectors[0].industries.length, 1);
  assert.equal(normalized.sectors[0].industries[0].focuses.length, 1);
  assert.equal(normalized.stats.focuses, 1);
});

test("updateSifTaxonomyNode preserves immutable ids while refreshing descendant path labels", () => {
  const updated = updateSifTaxonomyNode(createSampleTaxonomyDocument(), {
    kind: "sector",
    nodeId: "sector:real-estate",
    label: "Property",
    description: "Updated sector description",
    examples: ["property owners"],
    whyHere: null,
    aliases: ["Real Estate"],
    active: true,
    crosswalkOnly: false,
    seenInCrosswalks: []
  });

  assert.equal(updated.sectors[0].id, "sector:real-estate");
  assert.equal(updated.sectors[0].slug, "real-estate");
  assert.equal(updated.sectors[0].label, "Property");
  assert.deepEqual(updated.sectors[0].pathLabels, ["Property"]);
  assert.deepEqual(updated.sectors[0].industries[0].pathLabels, ["Property", "Real Estate Operating Companies"]);
  assert.deepEqual(updated.sectors[0].industries[0].focuses[0].pathLabels, [
    "Property",
    "Real Estate Operating Companies",
    "REIT"
  ]);
  assert.equal(updated.sectors[0].industries[0].sectorId, "sector:real-estate");
});

test("addSifTaxonomyNode appends new focus records using the backend id conventions and updates stats", () => {
  const updated = addSifTaxonomyNode(createSampleTaxonomyDocument(), {
    kind: "focus",
    sectorSlug: "real-estate",
    industrySlug: "real-estate-operating-companies",
    label: "Development",
    description: "Development focus description"
  });

  const focuses = updated.sectors[0].industries[0].focuses;
  const addedFocus = focuses[1];

  assert.equal(focuses.length, 2);
  assert.equal(addedFocus.id, "focus:real-estate:real-estate-operating-companies:development");
  assert.equal(addedFocus.slug, "development");
  assert.deepEqual(addedFocus.pathLabels, ["Real Estate", "Real Estate Operating Companies", "Development"]);
  assert.equal(addedFocus.sortOrder, 2);
  assert.equal(addedFocus.active, true);
  assert.equal(addedFocus.crosswalkOnly, false);
  assert.deepEqual(addedFocus.examples, []);
  assert.equal(updated.stats.focuses, 2);
});

