const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSegmentationDefaultViewModel,
  buildSegmentationDefaultDocument,
  resolveSegmentationDefaultEditorType
} = require("../app/models/segmentation-default-editor");

test("buildSegmentationDefaultViewModel derives category columns from flat crosswalk rows when no categories tree is present", () => {
  const document = {
    crosswalk: {
      Blogs: {
        focus: "Electric Power Transmission, Control, and Distribution",
        sector: "Other",
        "category heading": "Technology, Information and Media ",
        "subcategory heading": " Technology, Information and Internet "
      },
      Banking: {
        focus: "Public Policy Offices, Government",
        sector: "Financial Services",
        industry: "Banking Services",
        "category heading": "Financial Services ",
        "subcategory heading": " Credit Intermediation "
      },
      Retail: {
        focus: "Satellite Telecommunications",
        sector: "Other",
        "category heading": "Retail",
        "subcategory heading": 0
      }
    },
    "linkedin categories": []
  };

  const viewModel = buildSegmentationDefaultViewModel({
    document
  });

  assert.equal(viewModel.structure, "flat-crosswalk");
  assert.deepEqual(viewModel.categoryColumns, ["Category", "SubCategory", "Sub Sub Category"]);
  assert.equal(viewModel.rows.length, 3);
  assert.deepEqual(
    viewModel.rows.map((row) => row.categories),
    [
      ["Technology, Information and Media", "Technology, Information and Internet", "Blogs"],
      ["Financial Services", "Credit Intermediation", "Banking"],
      ["Retail", "", "Retail"]
    ]
  );
  assert.equal(viewModel.rows[1].sector, "Financial Services");
  assert.equal(viewModel.rows[1].industry, "Banking Services");
  assert.equal(viewModel.rows[2].focus, "Satellite Telecommunications");
});

test("buildSegmentationDefaultDocument rebuilds the flat crosswalk structure and preserves sibling document keys", () => {
  const sourceDocument = {
    crosswalk: {
      Blogs: {
        focus: "Electric Power Transmission, Control, and Distribution",
        sector: "Other",
        "category heading": "Technology, Information and Media ",
        "subcategory heading": " Technology, Information and Internet "
      }
    },
    "linkedin categories": []
  };

  const viewModel = buildSegmentationDefaultViewModel({
    document: sourceDocument
  });
  const nextRows = viewModel.rows.map((row) =>
    row.categories[2] === "Blogs"
      ? {
          ...row,
          sector: "Financial Services",
          industry: "Banking Services",
          focus: "Commercial Banking",
          notes: "Manually reviewed"
        }
      : row
  );
  nextRows.push({
    categories: ["Real Estate", "Real Estate Services", "Brokerage"],
    sector: "Real Estate",
    industry: "Real Estate Services",
    focus: "Brokerage",
    notes: "",
    __branchFieldNames: ["category heading", "subcategory heading"]
  });

  const rebuilt = buildSegmentationDefaultDocument({
    sourceDocument,
    structure: viewModel.structure,
    rows: nextRows
  });

  assert.deepEqual(rebuilt, {
    crosswalk: {
      Blogs: {
        sector: "Financial Services",
        industry: "Banking Services",
        focus: "Commercial Banking",
        notes: "Manually reviewed",
        "category heading": "Technology, Information and Media",
        "subcategory heading": "Technology, Information and Internet"
      },
      Brokerage: {
        sector: "Real Estate",
        industry: "Real Estate Services",
        focus: "Brokerage",
        "category heading": "Real Estate",
        "subcategory heading": "Real Estate Services"
      }
    },
    "linkedin categories": []
  });
});

test("resolveSegmentationDefaultEditorType honors explicit editor config and falls back to document inference", () => {
  assert.equal(resolveSegmentationDefaultEditorType("segmentation.default", null), "segmentation.default");
  assert.equal(resolveSegmentationDefaultEditorType({ type: "segmentation.default" }, null), "segmentation.default");
  assert.equal(
    resolveSegmentationDefaultEditorType(
      null,
      {
        crosswalk: {
          Blogs: {
            sector: "Other",
            focus: "Electric Power Transmission, Control, and Distribution",
            "category heading": "Technology, Information and Media"
          }
        }
      }
    ),
    "segmentation.default"
  );
  assert.equal(resolveSegmentationDefaultEditorType(null, { entries: { us: "United States" } }), null);
});
