import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/sound-effect.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("sound-effect: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "11111111-1111-4111-8111-111111111111" } }]);
  const out = await run(action, {
    "model": "eleven_text_to_sound_v2",
    "promptText": "rain",
    "duration": 4.5,
    "loop": true,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/sound_effect");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), {
    "promptText": "rain",
    "duration": 4.5,
    "loop": true,
    "model": "eleven_text_to_sound_v2",
  });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "taskId": "11111111-1111-4111-8111-111111111111",
  });
});

Deno.test("sound-effect: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () =>
      run(action, {
        "model": "eleven_text_to_sound_v2",
        "promptText": "rain",
        "duration": 4.5,
        "loop": true,
      }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});
