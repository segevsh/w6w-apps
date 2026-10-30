import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import createVoiceChannel from "../../actions/create-voice-channel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("create-voice-channel: PUT /voiceChannels with required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await createVoiceChannel.execute({ name: "lobby", channelCategoryID: "cat1" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/voiceChannels");
  assertEquals(JSON.parse(calls[0].body!), { name: "lobby", channelCategoryID: "cat1" });
});

test("create-voice-channel: is not idempotent", () => {
  assertEquals(createVoiceChannel.idempotent, false);
});
