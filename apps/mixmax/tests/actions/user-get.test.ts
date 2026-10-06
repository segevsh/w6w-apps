import { assertEquals } from "@std/assert";
import action from "../../actions/user-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("user-get: GET /users/me", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "u1" } }]);
  const out = await action.execute!({} as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/users/me");
  assertEquals(calls[0].body, null);
  assertEquals(out, { userId: "u1" });
});
