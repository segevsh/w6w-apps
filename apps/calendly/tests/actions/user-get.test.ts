import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

test("user-get: extracts the UUID from a full URI", async () => {
  const { ctx, calls } = mockCtx([{ body: { resource: {} } }]);
  await action.execute({ user: "https://api.calendly.com/users/AAAA" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/users/AAAA");
  assertEquals(calls[0].method, "GET");
});

test("user-get: accepts a bare UUID", async () => {
  const { ctx, calls } = mockCtx([{ body: { resource: {} } }]);
  await action.execute({ user: "AAAA" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/users/AAAA");
});
