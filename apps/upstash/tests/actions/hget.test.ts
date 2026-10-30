import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/hget.ts";

test("hget: POSTs /hget/{key}/{field}", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: "v1" } }]);
  assertEquals(await action.execute({ key: "h", field: "f1" }, ctx), { result: "v1" });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/hget/h/f1");
});
