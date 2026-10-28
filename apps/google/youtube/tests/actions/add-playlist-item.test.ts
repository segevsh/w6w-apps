import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-playlist-item.ts";

Deno.test("add-playlist-item: wraps the video id in the required nested resourceId", async () => {
  // A bare `videoId` in the body is silently ignored by the API — the nested
  // resourceId object is what actually identifies the video.
  const { ctx, calls } = mockCtx([{ body: { id: "I1" } }]);
  await action.execute!({ part: "snippet", playlistId: "PL1", videoId: "v1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/youtube/v3/playlistItems");
  assertEquals(url.searchParams.get("part"), "snippet");
  assertEquals(JSON.parse(calls[0].body!), {
    snippet: {
      playlistId: "PL1",
      resourceId: { kind: "youtube#video", videoId: "v1" },
    },
  });
});

Deno.test("add-playlist-item: forces snippet into part", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "status", playlistId: "PL1", videoId: "v1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("part"), "status,snippet");
});

Deno.test("add-playlist-item: sends an explicit position when given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "snippet", playlistId: "PL1", videoId: "v1", position: 0 }, ctx);
  // Position 0 is meaningful — it must not be dropped as falsy.
  assertEquals(JSON.parse(calls[0].body!).snippet.position, 0);
});

Deno.test("add-playlist-item: adds contentDetails to part only when it has something to write", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute!({ part: "snippet", playlistId: "PL1", videoId: "v1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("part"), "snippet");
  assertEquals(JSON.parse(calls[0].body!).contentDetails, undefined);

  await action.execute!({
    part: "snippet",
    playlistId: "PL1",
    videoId: "v1",
    note: "n",
    startAt: "PT1M30S",
    endAt: "PT3M",
  }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("part"), "snippet,contentDetails");
  assertEquals(JSON.parse(calls[1].body!).contentDetails, {
    note: "n",
    startAt: "PT1M30S",
    endAt: "PT3M",
  });
});

Deno.test("add-playlist-item: is honestly non-idempotent — YouTube allows duplicates", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
