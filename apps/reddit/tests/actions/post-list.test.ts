import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/post-list.ts";

Deno.test("post-list: builds the sort-specific listing URL with limit", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      kind: "Listing",
      data: { children: [{ kind: "t3", data: { id: "1" } }], after: "t3_1" },
    },
  }]);
  const out = await action.execute({ subreddit: "test", sort: "hot", limit: 10 }, ctx);
  assertEquals(calls[0].url, "https://oauth.reddit.com/r/test/hot.json?limit=10");
  assertEquals(out, { posts: [{ id: "1" }], after: "t3_1" });
});

Deno.test("post-list: passes the time window only for top/controversial", async () => {
  const { ctx, calls } = mockCtx([
    { body: { kind: "Listing", data: { children: [], after: null } } },
    { body: { kind: "Listing", data: { children: [], after: null } } },
  ]);
  await action.execute({ subreddit: "test", sort: "top", time: "week", limit: 25 }, ctx);
  await action.execute({ subreddit: "test", sort: "hot", time: "week", limit: 25 }, ctx);
  assertEquals(calls[0].url, "https://oauth.reddit.com/r/test/top.json?limit=25&t=week");
  assertEquals(calls[1].url, "https://oauth.reddit.com/r/test/hot.json?limit=25");
});

Deno.test("post-list: forwards the after cursor for pagination", async () => {
  const { ctx, calls } = mockCtx([{
    body: { kind: "Listing", data: { children: [], after: null } },
  }]);
  await action.execute({ subreddit: "test", sort: "new", after: "t3_5", limit: 25 }, ctx);
  assertEquals(calls[0].url, "https://oauth.reddit.com/r/test/new.json?limit=25&after=t3_5");
});
