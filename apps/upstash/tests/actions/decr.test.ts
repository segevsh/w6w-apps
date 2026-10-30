import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/decr.ts";

test("decr: POSTs /decr/{key}", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: 3 } }]);
  assertEquals(await action.execute({ key: "counter" }, ctx), { result: 3 });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/decr/counter");
});
