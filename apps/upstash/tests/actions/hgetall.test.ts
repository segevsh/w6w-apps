import { assertEquals } from "@std/assert";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/hgetall.ts";

Deno.test("hgetall: folds the flat [field, value, ...] array into an object", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: ["f1", "v1", "f2", "v2"] } }]);
  assertEquals(await action.execute({ key: "h" }, ctx), { result: { f1: "v1", f2: "v2" } });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/hgetall/h");
});

Deno.test("hgetall: returns {} for a missing key", async () => {
  const { ctx } = mockUpstashCtx([{ body: { result: [] } }]);
  assertEquals(await action.execute({ key: "missing" }, ctx), { result: {} });
});
