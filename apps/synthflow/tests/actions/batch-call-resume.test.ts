import { assertEquals } from "@std/assert";
import batchCallResume from "../../actions/batch-call-resume.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("batch-call-resume: POST /calls/batch/{id}/resume with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ batch_call_id: "b1", status: "resume" }) }]);
  const out = await batchCallResume.execute({ batch_call_id: "b1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/calls/batch/b1/resume");
  assertEquals(calls[0].body, null);
  assertEquals(out, { batch_call_id: "b1", status: "resume" });
});
