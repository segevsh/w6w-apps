import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-workflow-invocation.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-workflow-invocation: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "id": "inv-1",
      "status": "SUCCEEDED",
      "output": { "n1": ["u"] },
      "nodeErrors": { "n2": { "message": "x" } },
      "cost": { "credits": 7 },
    },
  }]);
  const out = await run(action, { "id": "inv-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/workflow_invocations/inv-1");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(calls[0].body, null);
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "id": "inv-1",
    "status": "SUCCEEDED",
    "done": true,
    "output": { "n1": ["u"] },
    "nodeErrors": { "n2": { "message": "x" } },
    "hasNodeErrors": true,
    "costCredits": 7,
  });
});

Deno.test("get-workflow-invocation: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () => run(action, { "id": "inv-1" }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});
