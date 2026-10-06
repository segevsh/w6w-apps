import { assertEquals } from "@std/assert";
import projectRunsList from "../../actions/project-runs-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-runs-list: GET runs with limit/offset and filters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { runs: [{ runId: "r1" }], nextPage: null, previousPage: null },
  }]);
  const out = await projectRunsList.execute({
    projectId: "p1",
    statusFilter: "ERRORED",
    runTriggerFilter: "API",
    limit: 10,
    offset: 20,
  }, ctx) as { runs: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v1/projects/p1/runs");
  assertEquals(queryOf(calls[0].url), {
    statusFilter: "ERRORED",
    runTriggerFilter: "API",
    limit: "10",
    offset: "20",
  });
  assertEquals(out.runs.length, 1);
});

Deno.test("project-runs-list: offset 0 is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { runs: [] } }]);
  await projectRunsList.execute({ projectId: "p1", offset: 0 }, ctx);
  assertEquals(queryOf(calls[0].url), { offset: "0" });
});
