import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bot-start-recording.ts";

Deno.test("bot-start-recording: no config means no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "b1" } }]);
  await action.execute!({ id: "b1" }, ctx);
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/bot/b1/start_recording/");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
});

Deno.test("bot-start-recording: the body is the recording config itself", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "b1" } }]);
  await action.execute!({
    id: "b1",
    transcriptProvider: "meeting_captions",
    transcriptLanguage: "fr",
    recordingConfig: { video_mixed_mp4: {} },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    transcript: { provider: { meeting_captions: { language_code: "fr" } } },
    video_mixed_mp4: {},
  });
  assertEquals(action.params!.map((p) => p.key), [
    "id",
    "transcriptProvider",
    "transcriptLanguage",
    "recordingConfig",
  ]);
});
