import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";
import runArtifacts from "../../actions/run-artifacts.ts";

Deno.test("run-artifacts: filters by repeated artifact_type and wraps the array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ artifact_id: "a_1", artifact_type: "recording" }] }]);
  const out = await runArtifacts.execute(
    { runId: "wr_1", artifactTypes: "recording, screenshot_final" },
    ctx,
  );
  assertEquals((out as { count: number }).count, 1);
  assertEquals(pathOf(calls[0].url), "/v1/runs/wr_1/artifacts");
  assertEquals(queryAll(calls[0].url, "artifact_type"), ["recording", "screenshot_final"]);
});
