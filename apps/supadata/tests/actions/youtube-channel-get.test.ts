import { assertEquals, assertRejects } from "@std/assert";
import channel from "../../actions/youtube-channel-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("youtube-channel-get: GETs /youtube/channel?id= and returns the channel", async () => {
  const body = { id: "UC1", name: "N", subscriberCount: 5 };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await channel.execute({ id: "@handle" }, ctx), body);
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/youtube/channel?id=%40handle");
});

Deno.test("youtube-channel-get: a 404 is thrown; a blank id makes no call", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: "not-found", message: "m", details: "No channel" },
  }]);
  await assertRejects(async () => await channel.execute({ id: "x" }, ctx), Error, "No channel");
  const none = mockCtx();
  await assertRejects(async () => await channel.execute({ id: "" }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
});
