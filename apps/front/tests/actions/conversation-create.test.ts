import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-create.ts";

Deno.test("conversation-create: a discussion carries its starter comment", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "cnv_1" } }]);
  await action.execute!(
    { type: "discussion", subject: "Refund policy", body: "thoughts?", inboxId: "inb_1" },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.type, "discussion");
  assertEquals(sent.inbox_id, "inb_1");
  assertEquals(sent.comment.body, "thoughts?");
});

/** Front rejects both together; saying so here names the problem. */
Deno.test("conversation-create: an inbox AND teammates is refused with the reason", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!(
        { type: "discussion", subject: "s", body: "b", inboxId: "inb_1", teammateIds: "tea_1" },
        ctx,
      ),
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});

Deno.test("conversation-create: neither an inbox nor teammates is refused too", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ type: "discussion", subject: "s", body: "b" }, ctx),
    Error,
    "inboxId",
  );
});

Deno.test("conversation-create: a discussion without a body is refused", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ type: "discussion", subject: "s", inboxId: "inb_1" }, ctx),
    Error,
    "discussion",
  );
});

/** Tasks take a due date, in Unix SECONDS. */
Deno.test("conversation-create: a task's due date is converted to Unix seconds", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "cnv_2" } }]);
  await action.execute!(
    { type: "task", subject: "Chase", inboxId: "inb_1", dueAt: "2027-01-01T00:00:00Z" },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.due_at, 1798761600);
  assert(sent.due_at < 2e10, "seconds, not milliseconds");
});

Deno.test("conversation-create: this route cannot reach a customer, and says so", () => {
  assert(/comment/i.test(action.description!), action.description);
  assertEquals(action.idempotent, false);
});
