import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-update.ts";

test("opportunity-update: PUTs /opportunities/{id} with only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ body: { opportunity: { id: 12, milestoneId: 15 } } }]);
  const out = await action.execute({ opportunityId: 12, milestoneId: 15 }, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/opportunities/12");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { opportunity: { milestone: { id: 15 } } });
  assertEquals(out, { opportunity: { id: 12, milestoneId: 15 } });
});
