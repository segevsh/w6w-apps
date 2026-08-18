import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-update.ts";

/**
 * The whole reason this action exists in this shape: Front's `tag_ids` REPLACES
 * the conversation's tags, so it is deliberately not offered here.
 */
Deno.test("conversation-update: exposes no tag field, because Front's replaces", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assert(!keys.some((k) => /tag/i.test(k)), keys.join(","));
  assert(/tag/i.test(action.description!), action.description);
});

Deno.test("conversation-update: status and inbox reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(
    await action.execute!({ conversationId: "cnv_1", status: "archived", inboxId: "inb_2" }, ctx),
    { ok: true },
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { status: "archived", inbox_id: "inb_2" });
});

/** `null` unassigns, and has to survive the compaction that drops empties. */
Deno.test("conversation-update: assigneeId `null` is sent as a real null", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ conversationId: "cnv_1", assigneeId: "null" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { assignee_id: null });
});

Deno.test("conversation-update: status and statusId together are refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!({ conversationId: "cnv_1", status: "open", statusId: "sts_1" }, ctx),
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});

Deno.test("conversation-update: an empty update is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ conversationId: "cnv_1" }, ctx),
    Error,
    "nothing",
  );
  assertEquals(calls.length, 0);
});

Deno.test("conversation-update: the custom-fields param warns that omissions are erased", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "customFields")!;
  assert(/erase/i.test(p.hint!), p.hint);
});
