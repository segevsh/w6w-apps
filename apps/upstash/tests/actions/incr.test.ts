import { assertEquals } from "@std/assert";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/incr.ts";

Deno.test("incr: POSTs /incr/{key}", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: 4 } }]);
  assertEquals(await action.execute({ key: "counter" }, ctx), { result: 4 });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/incr/counter");
});
