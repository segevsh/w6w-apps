import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/player-get-currently-playing.ts";

test("player-get-currently-playing: GETs /me/player/currently-playing", async () => {
  const { ctx, calls } = mockCtx([{ body: { is_playing: true, progress_ms: 1000 } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/me/player/currently-playing");
  assertEquals(out, { is_playing: true, progress_ms: 1000 });
});

test("player-get-currently-playing: normalizes a 204 (nothing playing) to is_playing: false", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await action.execute({}, ctx);
  assertEquals(out, { is_playing: false });
});

test("player-get-currently-playing: forwards market", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ market: "GB" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("market"), "GB");
});
