import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/generate-video.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("generate-video: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "dryRun": false,
      "id": "11111111-1111-4111-8111-111111111111",
      "routing": { "model": "gen4.5", "provider": "runway", "estimatedCost": { "credits": 50 } },
    },
  }]);
  const out = await run(action, {
    "configId": "my-router",
    "promptText": "waves",
    "duration": 5,
    "aspectRatio": "16:9",
    "dryRun": false,
    "extra": '{"referenceImages":[{"uri":"https://x.test/r.png"}]}',
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/generate/video");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), {
    "configId": "my-router",
    "dryRun": false,
    "input": {
      "referenceImages": [{ "uri": "https://x.test/r.png" }],
      "promptText": "waves",
      "duration": 5,
      "aspectRatio": "16:9",
    },
  });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "taskId": "11111111-1111-4111-8111-111111111111",
    "dryRun": false,
    "routing": { "model": "gen4.5", "provider": "runway", "estimatedCost": { "credits": 50 } },
  });
});

Deno.test("generate-video: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () =>
      run(action, {
        "configId": "my-router",
        "promptText": "waves",
        "duration": 5,
        "aspectRatio": "16:9",
        "dryRun": false,
        "extra": '{"referenceImages":[{"uri":"https://x.test/r.png"}]}',
      }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});

Deno.test("generate-video: a dry run returns routing and no task id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { dryRun: true, routing: { model: "gen4.5", estimatedCost: { credits: 50 } } },
  }]);
  const out = await run(action, { configId: "r", promptText: "x", dryRun: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).dryRun, true);
  assertEquals(out.taskId, undefined);
  assertEquals(out.dryRun, true);
});
