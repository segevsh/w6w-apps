import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-voice.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-voice: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "x1", "name": "n" } }]);
  const out = await run(action, { "id": "x1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/voices/x1");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(calls[0].body, null);
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), { "voice": { "id": "x1", "name": "n" } });
});

Deno.test("get-voice: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () => run(action, { "id": "x1" }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});
