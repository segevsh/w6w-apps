import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import updateVoiceChannel from "../../actions/update-voice-channel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("update-voice-channel: makePublic sends restrictedTo: null", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await updateVoiceChannel.execute({ voiceChannelID: "v1", makePublic: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/v0/voiceChannels/v1");
  assertEquals(JSON.parse(calls[0].body!), { restrictedTo: null });
});

test("update-voice-channel: is idempotent", () => {
  assertEquals(updateVoiceChannel.idempotent, true);
});
