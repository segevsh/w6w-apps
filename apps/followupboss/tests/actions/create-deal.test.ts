import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, param } from "../_helpers.ts";
import createDeal from "../../actions/create-deal.ts";

test("create-deal: POSTs /deals with milestones and custom fields flattened", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 2146 } }]);
  await createDeal.execute({
    name: "123 Main St",
    stageId: 5,
    price: 216000,
    peopleIds: [2, 5],
    userIds: [208],
    projectedCloseDate: "2026-01-27",
    possessionDate: "2026-01-27",
    customFields: { customField1: "A sample" },
  }, ctx);
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/deals");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "123 Main St",
    stageId: 5,
    price: 216000,
    peopleIds: [2, 5],
    userIds: [208],
    projectedCloseDate: "2026-01-27",
    possessionDate: "2026-01-27",
    customField1: "A sample",
  });
});

test("create-deal: requires name and stageId — not pipelineId", () => {
  assertEquals(
    (createDeal.params ?? []).filter((p) => p.required).map((p) => p.key),
    ["name", "stageId"],
  );
  assert(!(createDeal.params ?? []).some((p) => p.key === "pipelineId"));
});

/** A deal with no userIds is invisible to every agent while looking fine to an admin. */

/** A deal with no userIds is invisible to every agent while looking fine to an admin. */
test("create-deal: warns about the empty-userIds visibility trap", () => {
  assert(/invisible to every agent/i.test(createDeal.description!), createDeal.description);
  assert(param(createDeal, "userIds").hint?.includes("no agent can see"));
});
