import { assertEquals, assertRejects } from "@std/assert";
import playlist from "../../actions/youtube-playlist-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("youtube-playlist-get: GETs /youtube/playlist?id= and returns the playlist", async () => {
  const body = { id: "PL1", title: "T", videoCount: 3, channel: { id: "c", name: "n" } };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await playlist.execute({ id: "PL1" }, ctx), body);
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/youtube/playlist?id=PL1");
});

Deno.test("youtube-playlist-get: a 400 is thrown; a blank id makes no call", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: "invalid-request", message: "m", details: "Bad id" },
  }]);
  await assertRejects(
    async () => await playlist.execute({ id: "x" }, ctx),
    Error,
    "invalid-request: Bad id",
  );
  const none = mockCtx();
  await assertRejects(async () => await playlist.execute({ id: "" }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
});
