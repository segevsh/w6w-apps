import { assert, assertEquals, assertRejects } from "@std/assert";
import { API, bodyOf, mockConnectedCtx, mockCtx, NET } from "../_helpers.ts";
import action from "../../actions/comment-create.ts";

const INPUT = { "postId": 7, "text": "Nice!", "replyToId": 9 };

Deno.test("comment-create: POST /posts/{post_id}/comments on the connected Network", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
  await action.execute(INPUT as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API}/networks/${NET}/posts/7/comments`);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  const body = bodyOf(calls[0]);
  assertEquals(body, { "text": "Nice!", "reply_to_id": 9 });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("comment-create: returns the API body", async () => {
  const { ctx } = mockConnectedCtx([{ body: { id: 42, marker: "x" } }]);
  assertEquals(await action.execute(INPUT as never, ctx), { id: 42, marker: "x" });
});

Deno.test("comment-create: optional body fields that are unset are not sent", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
  await action.execute({ "postId": 7, "text": "Nice!" } as never, ctx);
  assertEquals(bodyOf(calls[0]), { "text": "Nice!" });
});

Deno.test("comment-create: declares what it needs and what it returns", () => {
  assertEquals(action.type, "perform");
  assertEquals((action.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "postId",
    "text",
  ]);
  assertEquals(action.idempotent, false);
  assert(Array.isArray(action.output) && action.output.length > 0);
});

Deno.test("comment-create: refuses to run on a connection with no Network ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "Network ID");
  assertEquals(calls.length, 0);
});

Deno.test("comment-create: surfaces the vendor error with status and path", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 403,
    statusText: "Forbidden",
    body: { error: "forbidden", message: "Not allowed" },
  }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "403");
});
