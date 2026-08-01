import { assertEquals } from "@std/assert";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/decr.ts";

Deno.test("decr: POSTs /decr/{key}", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: 3 } }]);
  assertEquals(await action.execute({ key: "counter" }, ctx), { result: 3 });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/decr/counter");
});
