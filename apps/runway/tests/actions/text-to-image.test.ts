import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/text-to-image.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("text-to-image: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "11111111-1111-4111-8111-111111111111" } }]);
  const out = await run(action, {
    "model": "gen4_image_turbo",
    "promptText": "a cat",
    "ratio": "1024:1024",
    "referenceImages": '[{"uri":"https://x.test/r.png","tag":"cat"}]',
    "outputCount": 2,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/text_to_image");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), {
    "promptText": "a cat",
    "ratio": "1024:1024",
    "referenceImages": [{ "uri": "https://x.test/r.png", "tag": "cat" }],
    "outputCount": 2,
    "model": "gen4_image_turbo",
  });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "taskId": "11111111-1111-4111-8111-111111111111",
  });
});

Deno.test("text-to-image: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () =>
      run(action, {
        "model": "gen4_image_turbo",
        "promptText": "a cat",
        "ratio": "1024:1024",
        "referenceImages": '[{"uri":"https://x.test/r.png","tag":"cat"}]',
        "outputCount": 2,
      }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});
