import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-workflows.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("list-workflows: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "data": [{ "name": "Ad", "versions": [{ "id": "v1", "version": 1 }] }] },
  }]);
  const out = await run(action, {}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/workflows");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(calls[0].body, null);
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "workflows": [{ "name": "Ad", "versions": [{ "id": "v1", "version": 1 }] }],
  });
});

Deno.test("list-workflows: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(() => run(action, {}, bad.ctx), Error, "No API key was provided.");
});
