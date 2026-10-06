import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-workflow.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-workflow: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": "wf-1", "name": "Ad", "graph": { "nodes": [], "edges": [], "version": 1 } },
  }]);
  const out = await run(action, { "id": "wf-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/workflows/wf-1");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(calls[0].body, null);
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "workflow": { "id": "wf-1", "name": "Ad", "graph": { "nodes": [], "edges": [], "version": 1 } },
  });
});

Deno.test("get-workflow: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () => run(action, { "id": "wf-1" }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});
