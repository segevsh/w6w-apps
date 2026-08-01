import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/post-search.ts";

Deno.test("post-search: searches all of Reddit when no subreddit is given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { kind: "Listing", data: { children: [], after: null } },
  }]);
  await action.execute({ query: "cats", limit: 25 }, ctx);
  assertEquals(
    calls[0].url,
    "https://oauth.reddit.com/search.json?q=cats&sort=relevance&limit=25",
  );
});

Deno.test("post-search: restricts to a subreddit and sets restrict_sr", async () => {
  const { ctx, calls } = mockCtx([{
    body: { kind: "Listing", data: { children: [], after: null } },
  }]);
  await action.execute({ query: "cats", subreddit: "aww", sort: "top", limit: 25 }, ctx);
  assertEquals(
    calls[0].url,
    "https://oauth.reddit.com/r/aww/search.json?q=cats&sort=top&limit=25&restrict_sr=true",
  );
});

Deno.test("post-search: returns posts and the pagination cursor", async () => {
  const { ctx } = mockCtx([{
    body: {
      kind: "Listing",
      data: { children: [{ kind: "t3", data: { id: "1" } }], after: "t3_1" },
    },
  }]);
  const out = await action.execute({ query: "cats", limit: 25 }, ctx);
  assertEquals(out, { posts: [{ id: "1" }], after: "t3_1" });
});
