import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-note.ts";
import { clock } from "../../lib/triggers.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const body = (...items: unknown[]) => ({ data: items, links: { next: null } });
const note = (id: string, at = "2026-11-10T11:55:00Z") => ({ id, updatedAt: at });

test("new-or-updated-note: seeds without reading or emitting", async () => {
  clock.now = () => NOW;
  const seed = mockCtx([]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 0);
});

test("new-or-updated-note: emits a new note and an edited note; retry is idempotent", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([]).ctx,
  );
  clock.now = () => NOW + 300_000;
  const page = body(note("note-2", "2026-11-10T12:01:00Z"), note("note-1", "2026-11-10T12:02:00Z"));
  const run = () =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx);
  const first = await run();
  assertEquals(first.events.length, 2);
  assertEquals(await run(), first);
});

test("new-or-updated-note: a note already seen (same stamp) is not re-emitted, and the next window binds the filter", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  clock.now = () => NOW + 300_000;
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: body(note("note-2", "2026-11-10T12:01:00Z")) }]).ctx,
  );
  assertEquals(first.events.length, 1);
  clock.now = () => NOW + 600_000;
  const next = mockCtx([{ body: body(note("note-2", "2026-11-10T12:01:00Z")) }]);
  const res = await trigger.poll!({ ...input, state: first.nextState }, next.ctx);
  assertEquals(res.events, []);
  // cursor = first poll time (12:05) - 10 min overlap.
  assertEquals(
    next.calls[0].url,
    "https://api.productboard.com/v2/notes?updatedFrom=2026-11-10T11%3A55%3A00.000Z",
  );
});
