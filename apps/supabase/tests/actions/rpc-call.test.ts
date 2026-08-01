import { assertEquals } from "@std/assert";
import { mockSupabaseCtx } from "../_helpers.ts";
import action from "../../actions/rpc-call.ts";

Deno.test("rpc-call: POSTs the args object to /rpc/<function>", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ body: 7 }]);
  const out = await action.execute({ function: "add_numbers", params: { a: 3, b: 4 } }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/rpc/add_numbers");
  assertEquals(JSON.parse(calls[0].body!), { a: 3, b: 4 });
  assertEquals(out, { result: 7 });
});

Deno.test("rpc-call: sends an empty object when no params are given", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ body: null }]);
  await action.execute({ function: "ping" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
