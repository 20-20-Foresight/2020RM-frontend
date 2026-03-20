const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getSearchResultFieldValue,
  getSchemaFieldPaths,
  resolveSchemaFieldPath,
  readObjectPath
} = require("../app/models/search-result");

test("readObjectPath resolves nested schema-style metadata paths", () => {
  assert.equal(
    readObjectPath(
      {
        metadata: {
          primaryemail: "ada@example.com"
        }
      },
      "metadata.primaryemail"
    ),
    "ada@example.com"
  );
});

test("getSearchResultFieldValue returns null for missing values", () => {
  assert.equal(getSearchResultFieldValue({}, "metadata.website"), null);
});

test("getSearchResultFieldValue returns organization website from metadata", () => {
  assert.equal(
    getSearchResultFieldValue(
      {
        metadata: {
          website: "https://acme.example"
        }
      },
      "metadata.website"
    ),
    "https://acme.example"
  );
});

test("getSearchResultFieldValue returns linkedin url from socials metadata", () => {
  assert.equal(
    getSearchResultFieldValue(
      {
        metadata: {
          socials: {
            linkedin: "https://www.linkedin.com/company/acme"
          }
        }
      },
      "metadata.socials.linkedin"
    ),
    "https://www.linkedin.com/company/acme"
  );
});

test("getSchemaFieldPaths reads field paths from schema documents", () => {
  assert.deepEqual(
    getSchemaFieldPaths({
      namespace: "crm.schema",
      key: "person",
      document: {
        fieldPaths: [
          { path: "metadata.primaryemail" },
          { path: "metadata.workemail" }
        ]
      }
    }),
    ["metadata.primaryemail", "metadata.workemail"]
  );
});

test("resolveSchemaFieldPath returns the first configured path present in schema", () => {
  assert.equal(
    resolveSchemaFieldPath(
      {
        document: {
          fieldPaths: [
            { path: "metadata.workemail" }
          ]
        }
      },
      ["metadata.primaryemail", "metadata.workemail"]
    ),
    "metadata.workemail"
  );
});

test("resolveSchemaFieldPath resolves linkedin paths from schema", () => {
  assert.equal(
    resolveSchemaFieldPath(
      {
        document: {
          fieldPaths: [
            { path: "metadata.socials.linkedin" }
          ]
        }
      },
      ["metadata.socials.linkedin", "linkedin"]
    ),
    "metadata.socials.linkedin"
  );
});
