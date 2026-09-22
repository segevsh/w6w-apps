import { assertEquals } from "@std/assert";
import toolTriggerAsync from "../../actions/tool-trigger-async.ts";
import { bodyOf, mockRelevanceCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-trigger-async: POSTs to trigger_async and returns the job receipt", async () => {
  const { ctx, calls } = mockRelevanceCtx([
    { body: { job_id: "j1", project: "proj-1", studio_id: "s1" } },
  ]);
  const out = await toolTriggerAsync.execute(
    { toolId: "s1", params: { url: "https://example.com" } },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/latest/studios/s1/trigger_async");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { params: { url: "https://example.com" } });
  // The tool id comes back with the job id because the poll path needs BOTH.
  assertEquals(out, { job_id: "j1", project: "proj-1", studio_id: "s1" });
});

Deno.test("tool-trigger-async: shares its input surface with the synchronous sibling", () => {
  assertEquals(toolTriggerAsync.type, "perform");
  assertEquals(toolTriggerAsync.idempotent, false);
  assertEquals(toolTriggerAsync.params?.map((p) => p.key), [
    "toolId",
    "params",
    "toolVersion",
    "maxJobDuration",
  ]);
});
