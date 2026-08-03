import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-playlist-items.ts";

Deno.test("list-playlist-items: hits /youtube/v3/playlistItems with part and playlistId", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ part: ["snippet", "contentDetails"], playlistId: "PL1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/youtube/v3/playlistItems");
  assertEquals(url.searchParams.get("part"), "snippet,contentDetails");
  assertEquals(url.searchParams.get("playlistId"), "PL1");
});

Deno.test("list-playlist-items: fetches specific memberships by id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "id", id: ["I1", "I2"] }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.getAll("id"), ["I1,I2"]);
  assertEquals(p.get("playlistId"), null);
});

Deno.test("list-playlist-items: videoId narrows a playlist query rather than standing alone", async () => {
  // This is how you find the membership id needed by remove-playlist-item.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "snippet", playlistId: "PL1", videoId: "v1" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("playlistId"), "PL1");
  assertEquals(p.get("videoId"), "v1");
});

Deno.test("list-playlist-items: rejects zero filters and both filters at once", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute!({ part: "snippet" }, ctx);
    },
    Error,
    "exactly one of `playlistId` or `id`",
  );
  await assertRejects(
    async () => {
      await action.execute!({ part: "snippet", playlistId: "PL1", id: "I1" }, ctx);
    },
    Error,
    "exactly one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("list-playlist-items: forwards paging", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "id", playlistId: "PL1", maxResults: 50, pageToken: "t" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("maxResults"), "50");
  assertEquals(p.get("pageToken"), "t");
});
