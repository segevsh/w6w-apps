import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import runRetry from "../../actions/run-retry.ts";

const HOST = "https://api.skyvern.com";

Deno.test("run-retry: POSTs /v1/agents/runs/{id}/retry", async () => {
  const { ctx, calls } = mockCtx([{ body: { run_id: "wr_2", attempt: 2 } }]);
  const out = await runRetry.execute({ runId: "wr_1" }, ctx);
  assertEquals((out as { attempt: number }).attempt, 2);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${HOST}/v1/agents/runs/wr_1/retry`);
});
