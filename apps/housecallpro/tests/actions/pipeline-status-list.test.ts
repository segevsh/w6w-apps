import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import pipelineStatusList from "../../actions/pipeline-status-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

test("pipeline-status-list: sends the required resource_type", async () => {
  const { ctx, calls } = mockCtx([{ body: page("statuses", [{ id: "ps1", name: "New" }]) }]);
  const out = await pipelineStatusList.execute({ resourceType: "lead" }, ctx);

  assertEquals(pathOf(calls[0].url), "/pipeline/statuses");
  assertEquals(queryOf(calls[0].url), { resource_type: "lead" });
  assertEquals(out.items.length, 1);
});

test("pipeline-status-list: an empty list means pipeline is off, and is not an error", async () => {
  const { ctx } = mockCtx([{ body: page("statuses", []) }]);
  const out = await pipelineStatusList.execute({ resourceType: "job" }, ctx);
  assertEquals(out.items, []);
  assertEquals(pipelineStatusList.description?.includes("not an"), true);
});

test("pipeline-status-list: resourceType is the one required query param in the app", () => {
  assertEquals(pipelineStatusList.params?.find((p) => p.key === "resourceType")?.required, true);
});
