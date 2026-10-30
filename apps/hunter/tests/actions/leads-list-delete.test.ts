import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/leads-list-delete.ts";

test("leads-list-delete: DELETEs /leads_lists/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/leads_lists/1");
  assertEquals(calls[0].method, "DELETE");
});

test("leads-list-delete: is marked idempotent", () => {
  assertEquals(action.idempotent, true);
});
