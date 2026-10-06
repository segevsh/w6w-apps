import { assertEquals } from "@std/assert";
import batchCallGet from "../../actions/batch-call-get.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("batch-call-get: GET /calls/batch/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ batch_call_id: "b1", status: "paused" }) }]);
  const out = await batchCallGet.execute({ batch_call_id: "b1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/calls/batch/b1");
  assertEquals(out, { batch_call_id: "b1", status: "paused" });
});
