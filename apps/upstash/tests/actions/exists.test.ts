import { assertEquals } from "@std/assert";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/exists.ts";

Deno.test("exists: POSTs /exists/{key}", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: 1 } }]);
  assertEquals(await action.execute({ key: "k" }, ctx), { result: 1 });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/exists/k");
});
