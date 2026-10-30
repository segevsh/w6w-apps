import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-delete.ts";

test("person-delete: DELETEs /persons/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 9 } } }]);
  await action.execute!({ personId: 9 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/persons/9");
  assertEquals(calls[0].method, "DELETE");
});
