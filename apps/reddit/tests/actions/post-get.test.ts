import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/post-get.ts";

Deno.test("post-get: fetches by fullname via /api/info", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      kind: "Listing",
      data: { children: [{ kind: "t3", data: { id: "abc", title: "hi" } }] },
    },
  }]);
  const out = await action.execute({ postId: "abc" }, ctx);
  assertEquals(calls[0].url, "https://oauth.reddit.com/api/info?id=t3_abc");
  assertEquals(out, { id: "abc", title: "hi" });
});

Deno.test("post-get: doesn't double-prefix an id that already carries t3_", async () => {
  const { ctx, calls } = mockCtx([{
    body: { kind: "Listing", data: { children: [{ kind: "t3", data: { id: "abc" } }] } },
  }]);
  await action.execute({ postId: "t3_abc" }, ctx);
  assertEquals(calls[0].url, "https://oauth.reddit.com/api/info?id=t3_abc");
});

Deno.test("post-get: throws when no post is found", async () => {
  const { ctx } = mockCtx([{ body: { kind: "Listing", data: { children: [] } } }]);
  await assertRejects(
    async () => {
      await action.execute({ postId: "missing" }, ctx);
    },
    Error,
    "no post found",
  );
});
