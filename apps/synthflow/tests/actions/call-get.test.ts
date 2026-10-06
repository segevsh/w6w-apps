import { assertEquals } from "@std/assert";
import callGet from "../../actions/call-get.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

const PAGE = { total_records: 1, limit: 20, offset: 0 };

Deno.test("call-get: GET /calls/{id} and unwraps the one-element calls array", async () => {
  const { ctx, calls } = mockCtx([{
    body: ok({ pagination: PAGE, calls: [{ call_id: "c1", transcript: "hi" }] }),
  }]);
  const out = await callGet.execute({ call_id: "c1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/calls/c1");
  assertEquals(out, { call: { call_id: "c1", transcript: "hi" } });
});
