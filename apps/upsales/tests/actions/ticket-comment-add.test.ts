import { assertEquals, assertRejects } from "@std/assert";
import ticketCommentAdd from "../../actions/ticket-comment-add.ts";
import { API_ROOT, envelope, mockCtx } from "../_helpers.ts";

Deno.test("ticket-comment-add: POSTs /tickets/{id}/comment", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 3 }) }]);
  const out = await ticketCommentAdd.execute(
    { id: 12, description: "Reset done", isPublic: true, userId: 8 },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/tickets/12/comment`);
  assertEquals(JSON.parse(calls[0].body!), {
    description: "Reset done",
    isPublic: true,
    user: { id: 8 },
  });
  assertEquals(out, { data: { id: 3 } });
});

Deno.test("ticket-comment-add: isPublic false is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 3 }) }]);
  await ticketCommentAdd.execute({ id: 12, description: "internal", isPublic: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).isPublic, false);
});

Deno.test("ticket-comment-add: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () => await ticketCommentAdd.execute({ id: 12, description: "x" }, ctx),
    Error,
    "401",
  );
});

Deno.test("ticket-comment-add: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () => await ticketCommentAdd.execute({ id: 12, description: "x" }, ctx),
    Error,
    "ThrottleLimit",
  );
});
