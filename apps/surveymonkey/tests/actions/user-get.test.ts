import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /users/me", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1234", email: "a@b.co" } }]);
  const result = await action.execute({}, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v3/users/me");
  assertEquals(result, { id: "1234", email: "a@b.co" });
});
