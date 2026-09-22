import { assert, assertEquals } from "@std/assert";
import toolTrigger from "../../actions/tool-trigger.ts";
import { bodyOf, mockRelevanceCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-trigger: POSTs params and the version selectors to /studios/{id}/trigger", async () => {
  const { ctx, calls } = mockRelevanceCtx([
    {
      body: {
        output: { answer: 42 },
        status: "complete",
        errors: [],
        cost: 0.01,
        credits_used: [{ type: "action", credits: 1 }],
        executionTime: 1234,
      },
    },
  ]);
  const out = await toolTrigger.execute(
    {
      toolId: "s1",
      params: { query: "hello" },
      toolVersion: "draft",
      maxJobDuration: "synchronous_seconds",
    },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/latest/studios/s1/trigger");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), {
    params: { query: "hello" },
    tool_version: "draft",
    max_job_duration: "synchronous_seconds",
  });
  assertEquals(out.status, "complete");
  assertEquals(out.output, { answer: 42 });
});

Deno.test("tool-trigger: a JSON string for params is parsed, and `version` is never sent", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: { status: "complete" } }]);
  await toolTrigger.execute({ toolId: "s1", params: '{"a":[1,2]}' }, ctx);

  const body = bodyOf(calls[0]);
  assertEquals(body.params, { a: [1, 2] });
  // The schema accepts `version` too, but only `tool_version` is documented on
  // the studio endpoints — offering both is how the wrong one gets pinned.
  assertEquals("version" in body, false);
  assertEquals("tool_version" in body, false);
});

Deno.test("tool-trigger: an in-progress tool is reported as such rather than as an error", async () => {
  const { ctx } = mockRelevanceCtx([{ body: { status: "inprogress", output: {}, errors: [] } }]);
  const out = await toolTrigger.execute({ toolId: "s1" }, ctx) as Record<string, unknown>;
  assertEquals(out.status, "inprogress");
});

Deno.test("tool-trigger: is a non-idempotent perform with the tool's params exposed", () => {
  assertEquals(toolTrigger.type, "perform");
  assertEquals(toolTrigger.idempotent, false);
  assertEquals(toolTrigger.params?.map((p) => p.key), [
    "toolId",
    "params",
    "toolVersion",
    "maxJobDuration",
  ]);
  assertEquals(toolTrigger.params?.find((p) => p.key === "params")?.type, "json");
  const options = toolTrigger.params?.find((p) => p.key === "maxJobDuration")?.options;
  assert(Array.isArray(options) && options.length === 4);
});
