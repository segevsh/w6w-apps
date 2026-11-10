import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newConversation from "../../triggers/new-conversation.ts";
import newOrUpdated from "../../triggers/new-or-updated-conversation.ts";

// Both triggers wrap `conversation-list` (GET /conversations, newest activity first).
const input = { params: {}, subscriptionId: "sub-1" };
const T0 = Date.UTC(2026, 10, 10, 0, 30, 0);
const OLD = T0 - 3_600_000;
const URL_LIST = "https://api2.frontapp.com/conversations?sort_order=desc&limit=100";
const conv = (id: string, createdMs: number, updatedMs = createdMs) => ({
  id,
  subject: `subject ${id}`,
  status: "unassigned",
  created_at: createdMs / 1000,
  updated_at: updatedMs / 1000,
});
const body = (items: unknown[]) => ({ body: { _results: items, _pagination: {} } });
const realNow = Date.now;
const at = async <T>(now: number, f: () => Promise<T>): Promise<T> => {
  Date.now = () => now;
  try {
    return await f();
  } finally {
    Date.now = realNow;
  }
};

test("new-conversation: seed emits nothing and stores a floor; a new conversation fires once", async () => {
  const seed = mockCtx([body([conv("cnv_1", OLD)])]);
  const seeded = await at(T0, () => newConversation.poll!({ ...input, state: {} }, seed.ctx));
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals((seeded.nextState as { floor?: number }).floor, T0);

  const page = [conv("cnv_2", T0 + 60_000), conv("cnv_1", OLD)];
  const first = await at(
    T0 + 300_000,
    () => newConversation.poll!({ ...input, state: seeded.nextState }, mockCtx([body(page)]).ctx),
  );
  const again = await at(
    T0 + 300_000,
    () => newConversation.poll!({ ...input, state: seeded.nextState }, mockCtx([body(page)]).ctx),
  );
  assertEquals(first.events, [conv("cnv_2", T0 + 60_000)]);
  assertEquals(again, first);
});

test("new-conversation: requests GET /conversations sorted descending, 100 per page", async () => {
  const c = mockCtx([body([])]);
  await at(T0, () => newConversation.poll!({ ...input, state: {} }, c.ctx));
  assertEquals(c.calls.length, 1);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(c.calls[0].url, URL_LIST);
});

test("new-conversation: an old conversation bumped to page 1 after the seed is not announced as new", async () => {
  const seeded = await at(
    T0,
    () => newConversation.poll!({ ...input, state: {} }, mockCtx([body([conv("cnv_1", OLD)])]).ctx),
  );
  // cnv_9 predates the seed (created OLD) but a reply bumped it onto page 1: not new.
  const bumped = conv("cnv_9", OLD, T0 + 120_000);
  const r = await at(
    T0 + 300_000,
    () =>
      newConversation.poll!({ ...input, state: seeded.nextState }, mockCtx([body([bumped])]).ctx),
  );
  assertEquals(r.events, []);
});

test("new-or-updated-conversation: seed emits nothing; an edited conversation is a new event", async () => {
  const seeded = await at(
    T0,
    () => newOrUpdated.poll!({ ...input, state: {} }, mockCtx([body([conv("cnv_1", OLD)])]).ctx),
  );
  assertEquals(seeded.events, []);
  const edited = conv("cnv_1", OLD, T0 + 120_000);
  const a = await at(
    T0 + 300_000,
    () => newOrUpdated.poll!({ ...input, state: seeded.nextState }, mockCtx([body([edited])]).ctx),
  );
  const b = await at(
    T0 + 300_000,
    () => newOrUpdated.poll!({ ...input, state: seeded.nextState }, mockCtx([body([edited])]).ctx),
  );
  assertEquals(a.events, [edited]);
  assertEquals(b, a);
  // the same edit seen again on the next check is not a new event
  const c = await at(
    T0 + 600_000,
    () => newOrUpdated.poll!({ ...input, state: a.nextState }, mockCtx([body([edited])]).ctx),
  );
  assertEquals(c.events, []);
});

test("new-or-updated-conversation: requests the same newest-activity-first page; pre-seed activity never fires", async () => {
  const c = mockCtx([body([conv("cnv_1", OLD)])]);
  const seeded = await at(T0, () => newOrUpdated.poll!({ ...input, state: {} }, c.ctx));
  assertEquals(c.calls[0].method, "GET");
  assertEquals(c.calls[0].url, URL_LIST);
  const flood = Array.from({ length: 100 }, (_, i) => conv(`cnv_${i + 10}`, OLD));
  const r = await at(
    T0 + 300_000,
    () => newOrUpdated.poll!({ ...input, state: seeded.nextState }, mockCtx([body(flood)]).ctx),
  );
  assertEquals(r.events, []);
  const fresh = conv("cnv_new", OLD, T0 + 400_000);
  const n = await at(
    T0 + 600_000,
    () =>
      newOrUpdated.poll!({ ...input, state: r.nextState }, mockCtx([body([fresh, ...flood])]).ctx),
  );
  assertEquals(n.events, [fresh]);
});
