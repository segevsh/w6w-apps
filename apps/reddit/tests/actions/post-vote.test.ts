import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/post-vote.ts";

Deno.test("post-vote: upvote sends dir=1 with the t3_ fullname", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await action.execute({ postId: "abc", direction: "up" }, ctx);
  assertEquals(calls[0].url, "https://oauth.reddit.com/api/vote");
  assertEquals(calls[0].body, "id=t3_abc&dir=1");
  assertEquals(out, { ok: true });
});

Deno.test("post-vote: downvote sends dir=-1", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ postId: "abc", direction: "down" }, ctx);
  assertEquals(calls[0].body, "id=t3_abc&dir=-1");
});

Deno.test("post-vote: unvote sends dir=0", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ postId: "abc", direction: "unvote" }, ctx);
  assertEquals(calls[0].body, "id=t3_abc&dir=0");
});

Deno.test("post-vote: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
