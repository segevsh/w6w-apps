import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-deals.ts";

test("list-deals: GETs /crm/v3/objects/deals", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/deals");
});
