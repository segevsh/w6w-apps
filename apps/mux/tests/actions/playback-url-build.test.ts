import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/playback-url-build.ts";

/** No API call at all. */
Deno.test("playback-url-build: builds both URLs locally", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await action.execute!({ playbackId: "pb1", thumbnailTime: 5 }, ctx) as {
    streamUrl: string;
    thumbnailUrl: string;
  };
  assertEquals(calls.length, 0);
  assertEquals(out.streamUrl, "https://stream.mux.com/pb1.m3u8");
  assertEquals(new URL(out.thumbnailUrl).searchParams.get("time"), "5");
});

/** A few seconds in avoids the black first frame. */
Deno.test("playback-url-build: the thumbnail time hint explains itself", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "thumbnailTime")!;
  assert(/black first frame/.test(p.hint!), p.hint);
});

Deno.test("playback-url-build: zero sizes are left to Mux's defaults", async () => {
  const { ctx } = mockCtx([]);
  const out = await action.execute!(
    { playbackId: "pb1", thumbnailWidth: 0, thumbnailHeight: 0 },
    ctx,
  ) as { thumbnailUrl: string };
  const url = new URL(out.thumbnailUrl);
  assertEquals(url.searchParams.get("width"), null);
  assertEquals(url.searchParams.get("height"), null);
});

Deno.test("playback-url-build: a missing playback id is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "playbackId");
});
