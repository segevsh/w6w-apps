import { assertEquals } from "@std/assert";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/sadd.ts";

Deno.test("sadd: POSTs /sadd/{key}/{member}", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: 1 } }]);
  assertEquals(await action.execute({ key: "s", member: "m1" }, ctx), { result: 1 });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/sadd/s/m1");
});
