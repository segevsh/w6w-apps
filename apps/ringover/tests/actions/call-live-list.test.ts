import { assertEquals } from "@std/assert";
import action from "../../actions/call-live-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("call-live-list: POSTs /calls/current and unwraps the list", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      current_calls_list_count: 1,
      total_current_calls_count: 1,
      current_calls_list: [{ call_id: "c" }],
    },
  }]);
  const out = await action.execute!({ direction: "IN" }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/calls/current");
  assertEquals(JSON.parse(calls[0].body!), { direction: "IN" });
  assertEquals(out, { calls: [{ call_id: "c" }], count: 1, total: 1 });
});

Deno.test("call-live-list: a 204 means nothing in progress", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({}, ctx), { calls: [], count: 0, total: 0 });
});
