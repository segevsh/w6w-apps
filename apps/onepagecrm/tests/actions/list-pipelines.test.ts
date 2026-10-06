import { assertEquals } from "@std/assert";
import listPipelines from "../../actions/list-pipelines.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-pipelines: GET /pipelines unwraps data.pipelines", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ pipelines: [{ pipeline: { id: "p1" } }], total_count: 1, page: 1 }),
  }]);
  const out = await listPipelines.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v3/pipelines");
  assertEquals(out.pipelines, [{ pipeline: { id: "p1" } }]);
});
