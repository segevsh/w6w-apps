import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: defaults to `me`", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.zoom.us/v2/users/me");
});

Deno.test("user-get: encodes an email into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ userId: "jo@acme.test" }, ctx);
  assertEquals(calls[0].url, "https://api.zoom.us/v2/users/jo%40acme.test");
});
