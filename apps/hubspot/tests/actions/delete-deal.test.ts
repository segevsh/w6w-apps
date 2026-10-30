import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-deal.ts";

test("delete-deal: DELETEs /crm/v3/objects/deals/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ id: "d1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/deals/d1");
  assertEquals(out, { id: "d1", deleted: true });
});
