const test = require("node:test");
const assert = require("node:assert/strict");

test("template crosswalk view model reads compiled target and row text fields", async () => {
  const {
    buildTemplateCrosswalkViewModel
  } = await import("../app/models/template-crosswalk-document.mjs");

  const model = buildTemplateCrosswalkViewModel({
    authoredKey: "phrases-authored",
    document: {
      documentType: "segmentation.template-crosswalk",
      compiled: {
        namespace: "crm.data",
        key: "phrases"
      },
      sets: [
        {
          id: "assets",
          label: "Assets"
        }
      ],
      keywords: [
        {
          id: "kw-office",
          value: "Office",
          sets: ["assets"]
        }
      ],
      templates: [
        {
          id: "tmpl-management-assets",
          pattern: "management of {assets}",
          outputs: {
            industry: [{ name: "RE Commercial", score: 3 }],
            focus: [{ name: "Property Management", score: 3 }]
          }
        }
      ]
    }
  });

  assert.equal(model.compiledTargetKey, "phrases");
  assert.equal(model.sets[0].label, "Assets");
  assert.equal(model.keywords[0].setsText, "assets");
  assert.equal(model.templates[0].industryTargetsText, "RE Commercial|3");
  assert.equal(model.templates[0].focusTargetsText, "Property Management|3");
});

test("template crosswalk document builder persists canonical arrays and compiled target", async () => {
  const {
    buildTemplateCrosswalkDocument
  } = await import("../app/models/template-crosswalk-document.mjs");

  const document = buildTemplateCrosswalkDocument({
    authoredKey: "phrases-authored",
    sourceDocument: {
      compiled: {
        type: "segmentation"
      }
    },
    compiledTargetNamespace: "crm.data",
    compiledTargetKey: "phrases",
    sets: [
      {
        id: "assets",
        label: "Assets",
        description: "Asset bucket",
        __extraFields: {}
      }
    ],
    keywords: [
      {
        id: "kw-office",
        value: "Office",
        setsText: "assets",
        __extraFields: {}
      }
    ],
    templates: [
      {
        id: "tmpl-management-assets",
        label: "Management Assets",
        pattern: "management of {assets}",
        description: "Description row",
        notes: "Template note",
        sectorTargetsText: "Real Estate|3",
        industryTargetsText: "RE Commercial|3",
        focusTargetsText: "Property Management|3",
        __extraFields: {}
      }
    ]
  });

  assert.equal(document.documentType, "segmentation.template-crosswalk");
  assert.deepEqual(document.compiled, {
    type: "segmentation",
    namespace: "crm.data",
    key: "phrases"
  });
  assert.deepEqual(document.sets, [
    {
      id: "assets",
      label: "Assets",
      description: "Asset bucket"
    }
  ]);
  assert.deepEqual(document.keywords, [
    {
      id: "kw-office",
      value: "Office",
      sets: ["assets"]
    }
  ]);
  assert.deepEqual(document.templates, [
    {
      id: "tmpl-management-assets",
      label: "Management Assets",
      pattern: "management of {assets}",
      description: "Description row",
      notes: "Template note",
      outputs: {
        sector: [{ name: "Real Estate", score: 3 }],
        industry: [{ name: "RE Commercial", score: 3 }],
        focus: [{ name: "Property Management", score: 3 }]
      }
    }
  ]);
});

test("template crosswalk detection tolerates authored documents without explicit documentType", async () => {
  const {
    looksLikeTemplateCrosswalkDocument,
    looksLikeCompiledCrosswalkDocument
  } = await import("../app/models/template-crosswalk-document.mjs");

  assert.equal(
    looksLikeTemplateCrosswalkDocument({
      compiled: {
        namespace: "crm.data",
        key: "phrases"
      },
      sets: [],
      keywords: [],
      templates: []
    }),
    true
  );

  assert.equal(
    looksLikeCompiledCrosswalkDocument({
      authoredDocumentId: "crm.data:phrases-authored",
      crosswalk: []
    }),
    true
  );
});
