import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-ticket.ts";

test("delete-ticket: DELETEs /crm/v3/objects/tickets/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ id: "t1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/tickets/t1");
  assertEquals(out, { id: "t1", deleted: true });
});
