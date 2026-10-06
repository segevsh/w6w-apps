import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bot-output-audio.ts";

Deno.test("bot-output-audio: POSTs kind mp3 and the base64 data", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "b1" } }]);
  await action.execute!({ id: "b1", b64Data: "SUQz" }, ctx);
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/bot/b1/output_audio/");
  assertEquals(JSON.parse(calls[0].body!), { kind: "mp3", b64_data: "SUQz" });
  assertEquals(action.idempotent, false);
});

Deno.test("bot-output-audio: a bot without automatic_audio_output is refused", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { detail: "automatic_audio_output not enabled" },
  }]);
  await assertRejects(
    async () => await action.execute!({ id: "b1", b64Data: "x" }, ctx),
    Error,
    "automatic_audio_output",
  );
});
