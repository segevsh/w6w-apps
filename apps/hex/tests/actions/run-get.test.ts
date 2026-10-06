import { assertEquals } from "@std/assert";
import runGet from "../../actions/run-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("run-get: GET /projects/{p}/runs/{r} returns status and timings", async () => {
  const { ctx, calls } = mockCtx([{
    body: { runId: "r1", status: "COMPLETED", startTime: "a", endTime: "b", elapsedTime: 1200 },
  }]);
  const out = await runGet.execute({ projectId: "p1", runId: "r1" }, ctx) as {
    status: string;
    elapsedTime: number;
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/projects/p1/runs/r1");
  assertEquals(out.status, "COMPLETED");
  assertEquals(out.elapsedTime, 1200);
});

Deno.test("run-get: both ids are escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await runGet.execute({ projectId: "p/1", runId: "r?1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/projects/p%2F1/runs/r%3F1");
});
