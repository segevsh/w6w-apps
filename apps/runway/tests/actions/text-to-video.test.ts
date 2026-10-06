import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/text-to-video.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("text-to-video: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "11111111-1111-4111-8111-111111111111" } }]);
  const out = await run(action, {
    "model": "gen4.5",
    "promptText": "clouds",
    "ratio": "1280:720",
    "duration": 5,
    "audio": false,
    "publicFigureThreshold": "low",
    "extra": '{"foo":1}',
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/text_to_video");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), {
    "foo": 1,
    "promptText": "clouds",
    "ratio": "1280:720",
    "duration": 5,
    "audio": false,
    "contentModeration": { "publicFigureThreshold": "low" },
    "model": "gen4.5",
  });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "taskId": "11111111-1111-4111-8111-111111111111",
  });
});

Deno.test("text-to-video: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () =>
      run(action, {
        "model": "gen4.5",
        "promptText": "clouds",
        "ratio": "1280:720",
        "duration": 5,
        "audio": false,
        "publicFigureThreshold": "low",
        "extra": '{"foo":1}',
      }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});

Deno.test("text-to-video: typed fields win over extra, and a missing model is refused", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t" } }]);
  await run(action, {
    model: "gen4.5",
    promptText: "typed",
    extra: { promptText: "extra", keep: true },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { promptText: "typed", keep: true, model: "gen4.5" });
  await assertRejects(
    () => run(action, { promptText: "x" }, mockCtx().ctx),
    Error,
    "model is required",
  );
  await assertRejects(
    () => run(action, { model: "m", extra: "[1]" }, mockCtx().ctx),
    Error,
    "extra must be a JSON object",
  );
});
