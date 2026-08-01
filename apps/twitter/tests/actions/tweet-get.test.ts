import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tweet-get.ts";

Deno.test("tweet-get: GETs /tweets/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "1", text: "hi" } } }]);
  const out = await action.execute({ tweetId: "1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.x.com/2/tweets/1");
  assertEquals(out, { id: "1", text: "hi" });
});

Deno.test("tweet-get: joins tweetFields into the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "1", text: "hi" } } }]);
  await action.execute({ tweetId: "1", tweetFields: ["created_at", "public_metrics"] }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.x.com/2/tweets/1?tweet.fields=created_at%2Cpublic_metrics",
  );
});
