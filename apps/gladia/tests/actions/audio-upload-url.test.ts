import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/audio-upload-url.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

Deno.test("audio-upload-url: POSTs JSON {audio_url} to /v2/upload", async () => {
  const res = { audio_url: "https://api.gladia.io/file/1", audio_metadata: { id: "1" } };
  const { ctx, calls } = mockCtx([{ body: res }]);
  assertEquals(await action.execute({ audioUrl: "https://x.test/a.mp3" }, ctx), res);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.gladia.io/v2/upload");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { audio_url: "https://x.test/a.mp3" });
});

Deno.test("audio-upload-url: a 400 throws with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody(400, "cannot fetch file") }]);
  await assertRejects(
    async () => await action.execute({ audioUrl: "u" }, ctx),
    Error,
    "cannot fetch file",
  );
});

Deno.test("audio-upload-url: declared non-idempotent perform", () => {
  assertEquals(action.idempotent, false);
});
