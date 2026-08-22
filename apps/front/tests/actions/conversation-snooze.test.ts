import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-snooze.ts";

Deno.test("conversation-snooze: the wake time is sent in Unix seconds", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!(
    { conversationId: "cnv_1", teammateId: "tea_1", scheduledAt: "2027-01-01T00:00:00Z" },
    ctx,
  ) as { scheduledAt: number };
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/conversations/cnv_1/reminders");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.teammate_id, "tea_1");
  assertEquals(sent.scheduled_at, 1798761600);
  assert(out.scheduledAt < 2e10, "seconds, not milliseconds");
});

/** No time means unsnooze — Front reads a null `scheduled_at` as "cancel". */
Deno.test("conversation-snooze: no time sends an explicit null, which unsnoozes", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ conversationId: "cnv_1", teammateId: "tea_1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert("scheduled_at" in sent, "the null must survive compaction");
  assertEquals(sent.scheduled_at, null);
});

Deno.test("conversation-snooze: Front requires a teammate, so this does too", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ conversationId: "cnv_1" }, ctx),
    Error,
    "teammateId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("conversation-snooze: an unparseable time is caught before the call", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!(
        { conversationId: "cnv_1", teammateId: "tea_1", scheduledAt: "soon" },
        ctx,
      ),
    Error,
    "scheduledAt",
  );
});
