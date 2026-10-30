import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/incr.ts";

test("incr: POSTs /incr/{key}", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: 4 } }]);
  assertEquals(await action.execute({ key: "counter" }, ctx), { result: 4 });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/incr/counter");
});
