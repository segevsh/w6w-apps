import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import runCancel from "../../actions/run-cancel.ts";

const HOST = "https://api.skyvern.com";

Deno.test("run-cancel: POSTs /v1/runs/{id}/cancel and reports success", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  assertEquals(await runCancel.execute({ runId: "tsk_1" }, ctx), {
    success: true,
    run_id: "tsk_1",
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${HOST}/v1/runs/tsk_1/cancel`);
  assertEquals(calls[0].body, null);
});
