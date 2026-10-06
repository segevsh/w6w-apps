import { assertEquals } from "@std/assert";
import action from "../../actions/user-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("user-get: GETs /users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "u1", status: "active" } } }]);
  const out = await action.execute!({ id: "u1" }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/users/u1");
  assertEquals(out, { id: "u1", status: "active" });
});
