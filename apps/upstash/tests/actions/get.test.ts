import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/get.ts";

test("get: POSTs /get/{key}", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: "hello" } }]);
  assertEquals(await action.execute({ key: "mykey" }, ctx), { result: "hello" });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/get/mykey");
  assertEquals(calls[0].method, "POST");
});

test("get: returns null result for a missing key", async () => {
  const { ctx } = mockUpstashCtx([{ body: { result: null } }]);
  assertEquals(await action.execute({ key: "missing" }, ctx), { result: null });
});
