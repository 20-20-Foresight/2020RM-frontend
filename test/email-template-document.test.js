const test = require("node:test");
const assert = require("node:assert/strict");

test("buildEmptyEmailTemplateDocument creates a draft-first template record", async () => {
  const {
    buildEmptyEmailTemplateDocument
  } = await import("../app/models/email-template-document.mjs");

  const document = buildEmptyEmailTemplateDocument({
    key: "welcome-sequence",
    name: "Welcome Sequence"
  });

  assert.equal(document.kind, "template");
  assert.equal(document.templateKey, "welcome-sequence");
  assert.equal(document.draft.name, "Welcome Sequence");
  assert.equal(document.active.name, "");
  assert.equal(document.slots.header.snippetKey, "");
  assert.equal(document.slots.footer.snippetKey, "");
});

test("buildEmptyEmailSnippetDocument creates a global snippet with draft and active content", async () => {
  const {
    buildEmptyEmailSnippetDocument
  } = await import("../app/models/email-template-document.mjs");

  const document = buildEmptyEmailSnippetDocument({
    key: "global-footer",
    name: "Global Footer",
    snippetKind: "footer"
  });

  assert.equal(document.kind, "snippet");
  assert.equal(document.snippetKey, "global-footer");
  assert.equal(document.snippetKind, "footer");
  assert.equal(document.scope, "global");
  assert.equal(document.draft.name, "Global Footer");
  assert.equal(document.active.html, "");
});

test("publishDraftEmailContentDocument promotes draft fields to active fields", async () => {
  const {
    buildEmptyEmailTemplateDocument,
    publishDraftEmailContentDocument
  } = await import("../app/models/email-template-document.mjs");

  const source = buildEmptyEmailTemplateDocument({
    key: "candidate-outreach",
    name: "Candidate Outreach"
  });
  source.draft.subject = "Hello {{receiver.name}}";
  source.draft.bodyHtml = "<p>Body</p>";
  source.draft.design = { body: { rows: [] } };

  const published = publishDraftEmailContentDocument(source);

  assert.notEqual(published, source);
  assert.deepEqual(published.active, source.draft);
  assert.deepEqual(published.draft, source.draft);
});

test("normalizeEmailContentDocument reads template slot references and version payloads", async () => {
  const {
    normalizeEmailContentDocument
  } = await import("../app/models/email-template-document.mjs");

  const normalized = normalizeEmailContentDocument({
    key: "intro-template",
    document: {
      kind: "template",
      templateKey: "intro-template",
      slots: {
        header: { snippetKey: "global-header" },
        footer: { snippetKey: "global-footer" }
      },
      draft: {
        name: "Intro Template",
        subject: "Hi {{receiver.name}}",
        bodyHtml: "<p>Hello</p>"
      },
      active: {
        name: "Intro Template",
        subject: "Hi {{receiver.name}}",
        bodyHtml: "<p>Hello</p>"
      }
    }
  });

  assert.equal(normalized.kind, "template");
  assert.equal(normalized.slots.header.snippetKey, "global-header");
  assert.equal(normalized.slots.footer.snippetKey, "global-footer");
  assert.equal(normalized.draft.subject, "Hi {{receiver.name}}");
});

test("buildEmailTemplatePreview composes header, body, and footer html", async () => {
  const {
    buildEmailTemplatePreview
  } = await import("../app/models/email-template-document.mjs");

  const preview = buildEmailTemplatePreview({
    template: {
      kind: "template",
      slots: {
        header: { snippetKey: "global-header" },
        footer: { snippetKey: "global-footer" }
      },
      draft: {
        subject: "Hello",
        bodyHtml: "<p>Main body</p>"
      }
    },
    snippetsByKey: {
      "global-header": {
        kind: "snippet",
        active: { html: "<header>Header</header>" },
        draft: { html: "<header>Draft Header</header>" }
      },
      "global-footer": {
        kind: "snippet",
        active: { html: "<footer>Footer</footer>" },
        draft: { html: "<footer>Draft Footer</footer>" }
      }
    },
    versionKey: "active"
  });

  assert.match(preview.html, /<header>Header<\/header>/);
  assert.match(preview.html, /<p>Main body<\/p>/);
  assert.match(preview.html, /<footer>Footer<\/footer>/);
});
