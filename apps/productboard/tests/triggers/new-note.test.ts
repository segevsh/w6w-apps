import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-note.ts";
import { clock } from "../../lib/triggers.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
// cursor - 10 min overlap, as the trigger binds the vendor filter.
const URL_AT_NOW = "https://api.productboard.com/v2/notes?createdFrom=2026-11-10T11%3A50%3A00.000Z";
const body = (...items: unknown[]) => ({ data: items, links: { next: null } });
const note = (id: string, updatedAt = "2026-11-10T11:55:00Z") => ({ id, updatedAt });

test("new-note: seeds without emitting and requests the filtered feed", async () => {
  clock.now = () => NOW;
  const seed = mockCtx([{ body: body(note("note-1")) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, URL_AT_NOW);
});

test("new-note: emits only the unseen note; retry is idempotent", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: body(note("note-1")) }]).ctx,
  );
  clock.now = () => NOW + 300_000;
  const page = body(note("note-2"), note("note-1"));
  const run = () =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx);
  const first = await run();
  assertEquals(first.events.length, 1);
  assertEquals(await run(), first);
});

test("new-note: a note already seen (same stamp) is not re-emitted", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: body(note("note-1")) }]).ctx,
  );
  clock.now = () => NOW + 300_000;
  const res = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: body(note("note-1")) }]).ctx,
  );
  assertEquals(res.events, []);
});
