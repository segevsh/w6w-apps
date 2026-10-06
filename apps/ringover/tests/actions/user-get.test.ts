import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/user-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("user-get: GETs /users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { user_id: 9, email: "a@b.com" } }]);
  const out = await action.execute!({ userId: 9 }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/users/9");
  assertEquals(out, { user_id: 9, email: "a@b.com" });
});

Deno.test("user-get: a 404 throws with Ringover's error text", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "User not found" } }]);
  await assertRejects(
    async () => await action.execute!({ userId: 1 }, ctx),
    Error,
    "User not found",
  );
});
