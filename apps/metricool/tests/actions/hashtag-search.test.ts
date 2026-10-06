import { assertEquals } from "@std/assert";
import hashtags from "../../actions/hashtag-search.ts";
import { envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("hashtag-search: GET /v2/analytics/hashtags with optional filters", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ name: "#w6w", postsCount: 10 }]) }]);
  const out = await hashtags.execute(
    { blogId: "9", network: "instagram", q: "w6w", limit: 5 },
    ctx,
  );
  assertEquals(out, { items: [{ name: "#w6w", postsCount: 10 }], count: 1 });
  assertEquals(queryOf(calls[0].url), { blogId: "9", network: "instagram", q: "w6w", limit: "5" });
});
