const test = require("node:test");
const assert = require("node:assert/strict");

let queuedSaveControllerPromise;

async function loadQueuedSaveController() {
  if (!queuedSaveControllerPromise) {
    queuedSaveControllerPromise = import("../app/models/queued-save-controller.mjs");
  }

  return queuedSaveControllerPromise;
}

test("queued save controller starts immediately when idle and tracks save summary updates", async () => {
  const { createQueuedSaveController } = await loadQueuedSaveController();
  const controller = createQueuedSaveController({
    version: 3,
    lastmodifieddate: "2026-04-14T12:00:00.000Z",
    lastmodifiedby: "before@example.com"
  });

  assert.deepEqual(controller.requestSave(), {
    shouldStart: true,
    state: {
      isSaving: true,
      hasQueuedSave: false
    }
  });

  const result = controller.completeSave({
    version: 4,
    lastmodifieddate: "2026-04-14T12:01:00.000Z",
    lastmodifiedby: "after@example.com"
  });

  assert.equal(result.shouldStart, false);
  assert.deepEqual(result.summary, {
    version: 4,
    lastmodifieddate: "2026-04-14T12:01:00.000Z",
    lastmodifiedby: "after@example.com"
  });
  assert.deepEqual(result.state, {
    isSaving: false,
    hasQueuedSave: false
  });
});

test("queued save controller only preserves one latest queued save while a request is in flight", async () => {
  const { createQueuedSaveController } = await loadQueuedSaveController();
  const controller = createQueuedSaveController({
    version: 8
  });

  controller.requestSave();

  assert.deepEqual(controller.requestSave(), {
    shouldStart: false,
    state: {
      isSaving: true,
      hasQueuedSave: true
    }
  });

  assert.deepEqual(controller.requestSave(), {
    shouldStart: false,
    state: {
      isSaving: true,
      hasQueuedSave: true
    }
  });

  const result = controller.completeSave({
    version: 9
  });

  assert.equal(result.shouldStart, true);
  assert.deepEqual(result.summary, {
    version: 9,
    lastmodifieddate: null,
    lastmodifiedby: null
  });
  assert.deepEqual(result.state, {
    isSaving: true,
    hasQueuedSave: false
  });
});
