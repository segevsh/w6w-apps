import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/character-performance.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("character-performance: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "11111111-1111-4111-8111-111111111111" } }]);
  const out = await run(action, {
    "model": "act_two",
    "characterType": "image",
    "characterUri": "https://x.test/c.png",
    "referenceUri": "https://x.test/r.mp4",
    "bodyControl": true,
    "expressionIntensity": 3,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/character_performance");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), {
    "character": { "type": "image", "uri": "https://x.test/c.png" },
    "reference": { "type": "video", "uri": "https://x.test/r.mp4" },
    "bodyControl": true,
    "expressionIntensity": 3,
    "model": "act_two",
  });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "taskId": "11111111-1111-4111-8111-111111111111",
  });
});

Deno.test("character-performance: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () =>
      run(action, {
        "model": "act_two",
        "characterType": "image",
        "characterUri": "https://x.test/c.png",
        "referenceUri": "https://x.test/r.mp4",
        "bodyControl": true,
        "expressionIntensity": 3,
      }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});
