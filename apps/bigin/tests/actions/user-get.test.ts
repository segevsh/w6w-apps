import { assertEquals, assertRejects } from "@std/assert";
import { mockBiginCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /bigin/v2/users/{id} and unwraps the users array", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { users: [{ id: "123", full_name: "Sarah" }] } }]);
  const user = await action.execute({ userId: "123" }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/bigin/v2/users/123");
  assertEquals(user.id, "123");
});

Deno.test("user-get: falls back to the `data` key the other endpoints use", async () => {
  const { ctx } = mockBiginCtx([{ body: { data: [{ id: "123" }] } }]);
  const user = await action.execute({ userId: "123" }, ctx) as { id: string };
  assertEquals(user.id, "123");
});

Deno.test("user-get: throws when Bigin answers 200 with no user", async () => {
  const { ctx } = mockBiginCtx([{ body: { users: [] } }]);
  await assertRejects(() => Promise.resolve(action.execute({ userId: "123" }, ctx)), Error);
});
