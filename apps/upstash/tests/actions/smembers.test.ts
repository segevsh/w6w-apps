import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/smembers.ts";

test("smembers: POSTs /smembers/{key}", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: ["m1", "m2"] } }]);
  assertEquals(await action.execute({ key: "s" }, ctx), { result: ["m1", "m2"] });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/smembers/s");
});
