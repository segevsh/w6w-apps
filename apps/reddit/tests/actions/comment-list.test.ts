import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/comment-list.ts";

test("comment-list: reads the comments half of the 2-element response", async () => {
  const { ctx, calls } = mockCtx([{
    body: [
      { kind: "Listing", data: { children: [{ kind: "t3", data: { id: "post1" } }] } },
      {
        kind: "Listing",
        data: {
          children: [
            { kind: "t1", data: { id: "c1", body: "first" } },
            { kind: "t1", data: { id: "c2", body: "second" } },
          ],
        },
      },
    ],
  }]);
  const out = await action.execute({ subreddit: "test", postId: "l0me7x", limit: 100 }, ctx);
  assertEquals(
    calls[0].url,
    "https://oauth.reddit.com/r/test/comments/l0me7x.json?limit=100",
  );
  assertEquals(out, { comments: [{ id: "c1", body: "first" }, { id: "c2", body: "second" }] });
});

test("comment-list: forwards the sort param when given", async () => {
  const { ctx, calls } = mockCtx([{
    body: [
      { kind: "Listing", data: { children: [] } },
      { kind: "Listing", data: { children: [] } },
    ],
  }]);
  await action.execute({ subreddit: "test", postId: "l0me7x", sort: "top", limit: 50 }, ctx);
  assertEquals(
    calls[0].url,
    "https://oauth.reddit.com/r/test/comments/l0me7x.json?sort=top&limit=50",
  );
});
