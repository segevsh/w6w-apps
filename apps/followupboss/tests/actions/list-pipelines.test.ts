import { assert, assertEquals } from "@std/assert";
import { mockCtx, param, run } from "../_helpers.ts";
import listPipelines from "../../actions/list-pipelines.ts";

Deno.test("list-pipelines: GETs /pipelines with an exact-match name", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      _metadata: { collection: "pipelines" },
      pipelines: [{ id: 1, name: "My Pipeline", stages: [{ id: 10 }, { id: 11 }] }],
    },
  }]);
  const result = await run<{ records: Array<{ stages: unknown[] }> }>(
    listPipelines,
    { name: "My Pipeline" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).searchParams.get("name"), "My Pipeline");
  // Stages arrive nested — this is the source of the stageId Create Deal needs.
  assertEquals(result.records[0].stages.length, 2);
});

Deno.test("list-pipelines: disambiguates itself from contact stages", () => {
  assert(/List Stages/.test(listPipelines.description!), listPipelines.description);
  assert(param(listPipelines, "name").hint?.includes("Exact match"));
});
