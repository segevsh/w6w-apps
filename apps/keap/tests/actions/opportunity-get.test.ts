import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import opportunityGet from "../../actions/opportunity-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const OPPORTUNITY = {
  id: "1",
  opportunity_title: "Deal",
  contact: { id: "9", email: "a@b.com" },
  stage: { id: "2", name: "Qualified" },
};

/**
 * The request is flat (`contact_id`, `stage_id`) and the response is nested
 * (`contact`, `stage` objects) — there is no `contact_id` on the way back.
 */
test("opportunity-get: the response nests the contact and stage", async () => {
  const { ctx, calls } = mockCtx([{ body: OPPORTUNITY }]);
  const out = await opportunityGet.execute({ opportunityId: "1" }, ctx) as {
    contact: { id: string };
    contact_id?: string;
  };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/opportunities/1");
  assertEquals(out.contact.id, "9");
  assertEquals(out.contact_id, undefined);
});

test("opportunity-get: the optional-fields allowlist is comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: OPPORTUNITY }]);
  await opportunityGet.execute({ opportunityId: "1", fields: ["custom_fields"] }, ctx);
  assertEquals(queryOf(calls[0].url).fields, "custom_fields");
});

test("opportunity-get: no fields parameter when none were asked for", async () => {
  const { ctx, calls } = mockCtx([{ body: OPPORTUNITY }]);
  await opportunityGet.execute({ opportunityId: "1" }, ctx);
  assertEquals(queryOf(calls[0].url).fields, undefined);
});
