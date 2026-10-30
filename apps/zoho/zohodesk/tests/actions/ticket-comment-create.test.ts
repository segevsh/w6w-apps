import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-comment-create.ts";

test("ticket-comment-create: POSTs /tickets/{id}/comments with content and isPublic", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "1" } }]);
  const out = await action.execute(
    { ticketId: "42", content: "Working on it", isPublic: false },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/tickets/42/comments");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { content: "Working on it", isPublic: false });
  assertEquals(out, { id: "1" });
});

test("ticket-comment-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
