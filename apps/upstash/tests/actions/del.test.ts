import { assertEquals } from "@std/assert";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/del.ts";

Deno.test("del: POSTs /del/{key} for a single key", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: 1 } }]);
  assertEquals(await action.execute({ keys: "k1" }, ctx), { result: 1 });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/del/k1");
});

Deno.test("del: splits a comma-separated list into multiple path segments", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: 2 } }]);
  assertEquals(await action.execute({ keys: "k1, k2" }, ctx), { result: 2 });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/del/k1/k2");
});
