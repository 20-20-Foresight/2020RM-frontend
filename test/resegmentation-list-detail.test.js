const test = require("node:test");
const assert = require("node:assert/strict");

test("buildSelectedListRows reads normalized member rows", async () => {
  const {
    buildSelectedListRows,
  } = await import("../app/models/resegmentation-list-detail.mjs");

  const rows = buildSelectedListRows({
    members: [
      {
        uuid: "membership-1",
        member: {
          uuid: "org-1",
          name: "Rose Builders Group",
          currentSegmentation: {
            industry: ["Real Estate"],
            focus: ["Development"],
          },
        },
      },
    ],
  });

  assert.deepEqual(rows, [
    {
      membershipUUID: "membership-1",
      uuid: "org-1",
      name: "Rose Builders Group",
      currentEMIndustry: "",
      currentSegmentation: {
        industry: ["Real Estate"],
        focus: ["Development"],
      },
    },
  ]);
});

test("buildSelectedListRows tolerates alternate upstream member shapes", async () => {
  const {
    buildSelectedListRows,
    countRenderableListMembers,
  } = await import("../app/models/resegmentation-list-detail.mjs");

  const listDetail = {
    members: [
      {
        uuid: "membership-1",
        entity2: {
          uuid: "org-1",
          name: "Rose Builders Group",
          currentEMIndustry: "PE RE",
          currentSegmentation: {
            industry: ["Real Estate"],
            focus: ["Development"],
          },
        },
      },
      {
        uuid: "membership-2",
        organization: {
          uuid: "org-2",
          name: "Beacon Health Partners",
        },
      },
    ],
  };

  const rows = buildSelectedListRows(listDetail);

  assert.equal(countRenderableListMembers(listDetail), 2);
  assert.deepEqual(rows.map((row) => row.uuid), ["org-1", "org-2"]);
  assert.equal(rows[1].name, "Beacon Health Partners");
  assert.equal(rows[0].currentEMIndustry, "PE RE");
});
