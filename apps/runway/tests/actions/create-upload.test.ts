import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-upload.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("create-upload: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "uploadUrl": "https://s3.test/u",
      "fields": { "key": "k" },
      "runwayUri": "runway://abc",
    },
  }]);
  const out = await run(action, { "filename": "clip.mp4" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/uploads");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), { "filename": "clip.mp4", "type": "ephemeral" });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "uploadUrl": "https://s3.test/u",
    "fields": { "key": "k" },
    "runwayUri": "runway://abc",
  });
});

Deno.test("create-upload: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () => run(action, { "filename": "clip.mp4" }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});
