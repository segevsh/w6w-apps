import { assertEquals } from "@std/assert";
import action from "../../actions/call-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("call-get: GETs /calls/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { list_count: 1, list: [{ cdr_id: 1 }] } }]);
  const out = await action.execute!({ callId: "abc/1" }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/calls/abc%2F1");
  assertEquals(out, { calls: [{ cdr_id: 1 }], count: 1 });
});

Deno.test("call-get: a 204 (no data) is an empty result", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ callId: "x" }, ctx), { calls: [], count: 0 });
});
