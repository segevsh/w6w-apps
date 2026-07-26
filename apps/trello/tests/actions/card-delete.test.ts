import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/card-delete.ts";

Deno.test("card-delete: DELETEs /cards/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { _value: null } }]);
  await action.execute({ id: "c1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/1/cards/c1");
});
