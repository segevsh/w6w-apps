import { assertEquals } from "@std/assert";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/lrange.ts";

Deno.test("lrange: POSTs /lrange/{key}/{start}/{stop}", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: ["a", "b"] } }]);
  assertEquals(await action.execute({ key: "list", start: 0, stop: -1 }, ctx), {
    result: ["a", "b"],
  });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/lrange/list/0/-1");
});
