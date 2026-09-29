import { assertEquals } from "@std/assert";
import conversationAudioGet from "../../actions/conversation-audio-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("conversation-audio-get: fetches GET /conversations/{id}/audio", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      meta: { retrieved_at: "2026-09-29T00:00:00Z" },
      data: { url: "https://test.com/audio.mp3" },
    },
  }]);

  const out = await conversationAudioGet.execute({ id: "conv1" }, ctx);

  assertEquals(calls[0].url, "https://api.otter.ai/v1/conversations/conv1/audio");
  assertEquals(out.data.url, "https://test.com/audio.mp3");
});

Deno.test("conversation-audio-get: id is required", () => {
  const param = conversationAudioGet.params!.find((p) => p.key === "id")!;
  assertEquals(param.required, true);
});
