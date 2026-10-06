import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/run-workflow.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("run-workflow: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "inv-1" } }]);
  const out = await run(action, { "id": "wf-1", "nodeOutputs": '{"n1":{"text":"hi"}}' }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/workflows/wf-1");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), { "nodeOutputs": { "n1": { "text": "hi" } } });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), { "invocationId": "inv-1" });
});

Deno.test("run-workflow: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () => run(action, { "id": "wf-1", "nodeOutputs": '{"n1":{"text":"hi"}}' }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});
