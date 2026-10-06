import { assertEquals } from "@std/assert";
import batchCallPause from "../../actions/batch-call-pause.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("batch-call-pause: POST /calls/batch/{id}/pause with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ batch_call_id: "b1", status: "pause" }) }]);
  const out = await batchCallPause.execute({ batch_call_id: "b1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/calls/batch/b1/pause");
  assertEquals(calls[0].body, null);
  assertEquals(out, { batch_call_id: "b1", status: "pause" });
});
