import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-note.ts";

const input = { params: {}, subscriptionId: "sub-1" };
test("new-note: seeds, emits new records, retries idempotently, and requests the feed", async () => {
  const seed = mockCtx([{ body: { data: [{ id: "note-1" }], links: { next: null } } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.productboard.com/v2/notes?createdFrom=2026-01-01T00%3A00%3A00Z",
  );
  const page = { data: [{ id: "note-2" }, { id: "note-1" }], links: { next: null } };
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});
