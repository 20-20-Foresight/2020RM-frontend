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
        "focus(es)": "Electric Power Transmission, Control, and Distribution",
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

test("buildSegmentationDefaultViewModel supports segmentation.code documents with code and description columns", () => {
  const document = {
    crosswalk: {
      "11": {
        sector: "Other",
        description: "Agriculture, Forestry, Fishing and Hunting"
      },
      "21": {
        sector: "Other",
        "focus(es)": "Mining",
        description: "Mining, Quarrying, and Oil and Gas Extraction"
      },
      "237": {
        sector: "Construction",
        industry: "Civil Engineering",
        description: "Heavy and Civil Engineering Construction"
      }
    },
    sheet1: []
  };

  const viewModel = buildSegmentationDefaultViewModel({
    editorType: "segmentation.code",
    document
  });

  assert.equal(viewModel.structure, "code-crosswalk");
  assert.deepEqual(viewModel.categoryColumns, ["code"]);
  assert.deepEqual(viewModel.valueColumns, [
    {
      key: "description",
      label: "description"
    }
  ]);
  assert.equal(viewModel.rows.length, 3);
  assert.deepEqual(
    viewModel.rows.map((row) => ({
      code: row.categories[0],
      description: row.description,
      sector: row.sector,
      industry: row.industry,
      focus: row.focus
    })),
    [
      {
        code: "11",
        description: "Agriculture, Forestry, Fishing and Hunting",
        sector: "Other",
        industry: "",
        focus: ""
      },
      {
        code: "21",
        description: "Mining, Quarrying, and Oil and Gas Extraction",
        sector: "Other",
        industry: "",
        focus: "Mining"
      },
      {
        code: "237",
        description: "Heavy and Civil Engineering Construction",
        sector: "Construction",
        industry: "Civil Engineering",
        focus: ""
      }
    ]
  );
});

test("buildSegmentationDefaultDocument saves segmentation.code rows with canonical focus fields", () => {
  const sourceDocument = {
    crosswalk: {
      "21": {
        sector: "Other",
        "focus(es)": "Mining",
        description: "Mining, Quarrying, and Oil and Gas Extraction"
      }
    },
    sheet1: []
  };

  const rebuilt = buildSegmentationDefaultDocument({
    sourceDocument,
    structure: "code-crosswalk",
    rows: [
      {
        categories: ["21"],
        description: "Mining, Quarrying, and Oil and Gas Extraction",
        sector: "Energy",
        industry: "Oil and Gas",
        focus: "Mining",
        notes: "Reviewed",
        __branchFieldNames: [],
        __extraLeafFields: {}
      },
      {
        categories: ["237"],
        description: "Heavy and Civil Engineering Construction",
        sector: "Construction",
        industry: "Civil Engineering",
        focus: "",
        notes: "",
        __branchFieldNames: [],
        __extraLeafFields: {}
      }
    ]
  });

  assert.deepEqual(rebuilt, {
    crosswalk: {
      "21": {
        description: "Mining, Quarrying, and Oil and Gas Extraction",
        sector: "Energy",
        industry: "Oil and Gas",
        focus: "Mining",
        notes: "Reviewed"
      },
      "237": {
        description: "Heavy and Civil Engineering Construction",
        sector: "Construction",
        industry: "Civil Engineering"
      }
    },
    sheet1: []
  });
});

test("buildSegmentationDefaultViewModel supports segmentation.list documents with non-SIF columns on the left", () => {
  const document = {
    sheet1: [
      {
        code: "11",
        description: "Agriculture, Forestry, Fishing and Hunting",
        sector: "Other"
      },
      {
        code: "21",
        description: "Mining, Quarrying, and Oil and Gas Extraction",
        "focus(es)": "Mining",
        sector: "Other"
      },
      {
        code: "237",
        description: "Heavy and Civil Engineering Construction",
        sector: "Construction",
        industry: "Civil Engineering"
      }
    ]
  };

  const viewModel = buildSegmentationDefaultViewModel({
    editorType: "segmentation.list",
    document
  });

  assert.equal(viewModel.structure, "list-rows");
  assert.deepEqual(viewModel.categoryColumns, ["code", "description"]);
  assert.deepEqual(viewModel.valueColumns, []);
  assert.equal(viewModel.rows.length, 3);
  assert.deepEqual(
    viewModel.rows.map((row) => ({
      left: row.categories,
      sector: row.sector,
      industry: row.industry,
      focus: row.focus
    })),
    [
      {
        left: ["11", "Agriculture, Forestry, Fishing and Hunting"],
        sector: "Other",
        industry: "",
        focus: ""
      },
      {
        left: ["21", "Mining, Quarrying, and Oil and Gas Extraction"],
        sector: "Other",
        industry: "",
        focus: "Mining"
      },
      {
        left: ["237", "Heavy and Civil Engineering Construction"],
        sector: "Construction",
        industry: "Civil Engineering",
        focus: ""
      }
    ]
  );
});

test("buildSegmentationDefaultDocument saves segmentation.list rows back to the original array wrapper", () => {
  const sourceDocument = {
    sheet1: [
      {
        code: "21",
        description: "Mining, Quarrying, and Oil and Gas Extraction",
        "focus(es)": "Mining",
        sector: "Other"
      }
    ]
  };

  const rebuilt = buildSegmentationDefaultDocument({
    sourceDocument,
    structure: "list-rows",
    rows: [
      {
        categories: ["21", "Mining, Quarrying, and Oil and Gas Extraction"],
        sector: "Energy",
        industry: "Oil and Gas",
        focus: "Mining",
        notes: "Reviewed",
        __branchFieldNames: ["code", "description"],
        __extraLeafFields: {}
      },
      {
        categories: ["237", "Heavy and Civil Engineering Construction"],
        sector: "Construction",
        industry: "Civil Engineering",
        focus: "",
        notes: "",
        __branchFieldNames: ["code", "description"],
        __extraLeafFields: {}
      }
    ]
  });

  assert.deepEqual(rebuilt, {
    sheet1: [
      {
        code: "21",
        description: "Mining, Quarrying, and Oil and Gas Extraction",
        sector: "Energy",
        industry: "Oil and Gas",
        focus: "Mining",
        notes: "Reviewed"
      },
      {
        code: "237",
        description: "Heavy and Civil Engineering Construction",
        sector: "Construction",
        industry: "Civil Engineering"
      }
    ]
  });
});

test("resolveSegmentationDefaultEditorType honors explicit editor config and falls back to document inference", () => {
  assert.equal(resolveSegmentationDefaultEditorType("segmentation.default", null), "segmentation.default");
  assert.equal(resolveSegmentationDefaultEditorType({ type: "segmentation.default" }, null), "segmentation.default");
  assert.equal(resolveSegmentationDefaultEditorType("segmentation.code", null), "segmentation.code");
  assert.equal(resolveSegmentationDefaultEditorType({ type: "segmentation.code" }, null), "segmentation.code");
  assert.equal(resolveSegmentationDefaultEditorType("segmentation.list", null), "segmentation.list");
  assert.equal(resolveSegmentationDefaultEditorType({ type: "segmentation.list" }, null), "segmentation.list");
  assert.equal(
    resolveSegmentationDefaultEditorType(
      null,
      {
        crosswalk: {
          "21": {
            description: "Mining, Quarrying, and Oil and Gas Extraction",
            "focus(es)": "Mining",
            sector: "Other"
          }
        }
      },
      "segmentation"
    ),
    "segmentation.code"
  );
  assert.equal(
    resolveSegmentationDefaultEditorType(
      null,
      {
        sheet1: [
          {
            code: "21",
            description: "Mining, Quarrying, and Oil and Gas Extraction",
            sector: "Other"
          }
        ]
      },
      "segmentation"
    ),
    "segmentation.list"
  );
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
