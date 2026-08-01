import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tweet-delete.ts";

Deno.test("tweet-delete: DELETEs /tweets/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { deleted: true } } }]);
  const out = await action.execute({ tweetId: "123" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.x.com/2/tweets/123");
  assertEquals(out, { deleted: true });
});

Deno.test("tweet-delete: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
