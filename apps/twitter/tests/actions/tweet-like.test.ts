import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tweet-like.ts";

Deno.test("tweet-like: resolves /users/me, then POSTs /users/{id}/likes", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: { id: "7" } } },
    { body: { data: { liked: true } } },
  ]);
  const out = await action.execute({ tweetId: "99" }, ctx);
  assertEquals(calls[0].url, "https://api.x.com/2/users/me");
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].url, "https://api.x.com/2/users/7/likes");
  assertEquals(JSON.parse(calls[1].body!), { tweet_id: "99" });
  assertEquals(out, { liked: true });
});

Deno.test("tweet-like: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
