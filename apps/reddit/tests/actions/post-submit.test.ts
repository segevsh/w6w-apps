import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/post-submit.ts";

Deno.test("post-submit: submits a self post with title and text", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      json: { errors: [], data: { id: "1", name: "t3_1", url: "https://reddit.com/r/test/1" } },
    },
  }]);
  const out = await action.execute(
    { subreddit: "test", kind: "self", title: "hi", text: "body" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://oauth.reddit.com/api/submit");
  assertEquals(
    calls[0].body,
    "api_type=json&sr=test&kind=self&title=hi&text=body&nsfw=false&spoiler=false",
  );
  assertEquals(out, { id: "1", name: "t3_1", url: "https://reddit.com/r/test/1" });
});

Deno.test("post-submit: submits a link post with url and resubmit", async () => {
  const { ctx, calls } = mockCtx([{
    body: { json: { errors: [], data: { id: "2", name: "t3_2", url: "https://example.com" } } },
  }]);
  await action.execute(
    { subreddit: "test", kind: "link", title: "hi", url: "https://example.com", resubmit: true },
    ctx,
  );
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("url"), "https://example.com");
  assertEquals(body.get("resubmit"), "true");
  assertEquals(body.get("text"), null);
});

Deno.test("post-submit: throws when kind is self without text", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ subreddit: "test", kind: "self", title: "hi" }, ctx);
    },
    Error,
    "needs `text`",
  );
});

Deno.test("post-submit: throws when kind is link without url", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ subreddit: "test", kind: "link", title: "hi" }, ctx);
    },
    Error,
    "needs `url`",
  );
});

Deno.test("post-submit: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
