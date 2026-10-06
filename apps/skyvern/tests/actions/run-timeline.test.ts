import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import runTimeline from "../../actions/run-timeline.ts";

const HOST = "https://api.skyvern.com";

Deno.test("run-timeline: GETs /v1/runs/{id}/timeline", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ type: "block", children: [] }] }]);
  const out = await runTimeline.execute({ runId: "wr_1" }, ctx);
  assertEquals((out as { count: number }).count, 1);
  assertEquals(calls[0].url, `${HOST}/v1/runs/wr_1/timeline`);
});

// ---- agents ------------------------------------------------------------------------------
