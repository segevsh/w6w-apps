import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-get.ts";

Deno.test("list-get: GETs /lists/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1" } }]);
  await action.execute({ id: "l1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/1/lists/l1");
});
