import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-comment-threads.ts";

Deno.test("list-comment-threads: hits /youtube/v3/commentThreads with part and videoId", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ part: ["snippet", "replies"], videoId: "v1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/youtube/v3/commentThreads");
  assertEquals(url.searchParams.get("part"), "snippet,replies");
  assertEquals(url.searchParams.get("videoId"), "v1");
});

Deno.test("list-comment-threads: keeps channelId and allThreadsRelatedToChannelId distinct", async () => {
  const { ctx: c1, calls: k1 } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "snippet", channelId: "UC1" }, c1);
  const p1 = new URL(k1[0].url).searchParams;
  assertEquals(p1.get("channelId"), "UC1");
  assertEquals(p1.get("allThreadsRelatedToChannelId"), null);

  const { ctx: c2, calls: k2 } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "snippet", allThreadsRelatedToChannelId: "UC1" }, c2);
  const p2 = new URL(k2[0].url).searchParams;
  assertEquals(p2.get("allThreadsRelatedToChannelId"), "UC1");
  assertEquals(p2.get("channelId"), null);
});

Deno.test("list-comment-threads: rejects zero or several filters", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute!({ part: "snippet" }, ctx);
    },
    Error,
    "exactly one of",
  );
  await assertRejects(
    async () => {
      await action.execute!({ part: "snippet", videoId: "v1", channelId: "UC1" }, ctx);
    },
    Error,
    "exactly one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("list-comment-threads: forwards ordering, search and moderation filters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    part: "snippet",
    videoId: "v1",
    maxResults: 100,
    pageToken: "t",
    order: "relevance",
    searchTerms: "great",
    moderationStatus: "heldForReview",
    textFormat: "plainText",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("maxResults"), "100");
  assertEquals(p.get("pageToken"), "t");
  assertEquals(p.get("order"), "relevance");
  assertEquals(p.get("searchTerms"), "great");
  assertEquals(p.get("moderationStatus"), "heldForReview");
  assertEquals(p.get("textFormat"), "plainText");
});

Deno.test("list-comment-threads: offers the replies part", () => {
  const part = action.params!.find((p) => p.key === "part");
  assertEquals((part!.options as Array<{ value: string }>).map((o) => o.value), [
    "id",
    "snippet",
    "replies",
  ]);
  assertEquals(part?.default, "snippet,replies");
});
