import { assertEquals } from "@std/assert";
import batchCallCancel from "../../actions/batch-call-cancel.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("batch-call-cancel: POST /calls/batch/{id}/cancel with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ batch_call_id: "b1", status: "cancel" }) }]);
  const out = await batchCallCancel.execute({ batch_call_id: "b1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/calls/batch/b1/cancel");
  assertEquals(calls[0].body, null);
  assertEquals(out, { batch_call_id: "b1", status: "cancel" });
});
