import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-note.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const note = (id: string, lastEditedAt = "2026-11-09T09:00:00.000Z") => ({ id, lastEditedAt });
const page = (notes: unknown[]) => ({ body: { notes, total: notes.length, hasNextPage: false } });
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;

test("new-or-updated-note: seeds without emitting", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} } as never,
    mockCtx([page([note("a")])]).ctx,
  );
  assertEquals(events(seeded), []);
  assertEquals((next(seeded) as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-note: emits only the unseen note and is idempotent on retry", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} } as never,
    mockCtx([page([note("a")])]).ctx,
  );
  const items = [note("b"), note("a")];
  const first = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page(items)]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page(items)]).ctx,
  );
  assertEquals(events(first), [note("b")]);
  assertEquals(retry, first);
});

test("new-or-updated-note: an edited note (same id, new lastEditedAt) is emitted again", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} } as never,
    mockCtx([page([note("a")])]).ctx,
  );
  const edited = note("a", "2026-11-10T09:00:00.000Z");
  const r = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page([edited, note("a")])]).ctx,
  );
  assertEquals(events(r), [edited]);
});

test("new-or-updated-note: requests notes ordered by lastEditedAt_DESC", async () => {
  const c = mockCtx([page([note("a")])]);
  await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(c.calls[0].url, "https://api.slite.com/v1/notes?orderBy=lastEditedAt_DESC");
});
