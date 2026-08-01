import { assertEquals } from "@std/assert";
import { mockUpstashCtx } from "../_helpers.ts";
import action from "../../actions/rpush.ts";

Deno.test("rpush: POSTs /rpush/{key}/{value}", async () => {
  const { ctx, calls } = mockUpstashCtx([{ body: { result: 2 } }]);
  assertEquals(await action.execute({ key: "list", value: "b" }, ctx), { result: 2 });
  assertEquals(calls[0].url, "https://usw1-example-12345.upstash.io/rpush/list/b");
});
