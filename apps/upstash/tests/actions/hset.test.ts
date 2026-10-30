import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/hset.ts";

test("hset: POSTs /hset/{key}/{field}/{value}", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: 1 } }]);
  assertEquals(await action.execute({ key: "h", field: "f1", value: "v1" }, ctx), { result: 1 });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/hset/h/f1/v1");
});
