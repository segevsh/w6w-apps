import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-delete.ts";

Deno.test("person-delete: DELETEs /persons/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 9 } } }]);
  await action.execute!({ personId: 9 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/persons/9");
  assertEquals(calls[0].method, "DELETE");
});
