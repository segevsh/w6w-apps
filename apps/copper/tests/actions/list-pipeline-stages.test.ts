import { assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import action from "../../actions/list-pipeline-stages.ts";

Deno.test("list-pipeline-stages: GETs the flat list when no pipeline is named", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 987790, pipeline_id: 213214 }] }]);
  const out = await run<{ stages: unknown[] }>(action, {}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/pipeline_stages");
  assertEquals(out.stages, [{ id: 987790, pipeline_id: 213214 }]);
});

Deno.test("list-pipeline-stages: switches to the per-pipeline path when one is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({ pipelineId: 213214 }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.copper.com/developer_api/v1/pipeline_stages/pipeline/213214",
  );
});

Deno.test("list-pipeline-stages: an empty string is treated as absent, not as an empty segment", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({ pipelineId: "" }, ctx);
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/pipeline_stages");
});
