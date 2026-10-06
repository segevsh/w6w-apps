import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/image-upscale.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("image-upscale: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "11111111-1111-4111-8111-111111111111" } }]);
  const out = await run(action, {
    "model": "magnific_precision_upscaler_v2",
    "imageUri": "https://x.test/a.png",
    "scaleFactor": "4",
    "flavor": "photo",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/image_upscale");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), {
    "imageUri": "https://x.test/a.png",
    "scaleFactor": 4,
    "flavor": "photo",
    "model": "magnific_precision_upscaler_v2",
  });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "taskId": "11111111-1111-4111-8111-111111111111",
  });
});

Deno.test("image-upscale: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () =>
      run(action, {
        "model": "magnific_precision_upscaler_v2",
        "imageUri": "https://x.test/a.png",
        "scaleFactor": "4",
        "flavor": "photo",
      }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});
