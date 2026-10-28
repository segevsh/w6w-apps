import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-playlists.ts";

Deno.test("list-playlists: hits /youtube/v3/playlists with part and a channel filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ part: ["snippet", "contentDetails"], channelId: "UC1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/youtube/v3/playlists");
  assertEquals(url.searchParams.get("part"), "snippet,contentDetails");
  assertEquals(url.searchParams.get("channelId"), "UC1");
});

Deno.test("list-playlists: joins multiple ids into one comma-separated value", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "id", id: ["PL1", "PL2"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.getAll("id"), ["PL1,PL2"]);
});

Deno.test("list-playlists: supports the mine filter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { part: "snippet", mine: true, maxResults: 50, pageToken: "t", hl: "es" },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("mine"), "true");
  assertEquals(p.get("maxResults"), "50");
  assertEquals(p.get("pageToken"), "t");
  assertEquals(p.get("hl"), "es");
});

Deno.test("list-playlists: rejects zero or multiple filters", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute!({ part: "snippet" }, ctx);
    },
    Error,
    "exactly one of `id`, `channelId` or `mine`",
  );
  await assertRejects(
    async () => {
      await action.execute!({ part: "snippet", mine: true, channelId: "UC1" }, ctx);
    },
    Error,
    "exactly one of",
  );
  assertEquals(calls.length, 0);
});
