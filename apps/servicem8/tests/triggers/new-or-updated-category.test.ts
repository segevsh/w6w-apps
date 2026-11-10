import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-category.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const cat = (uuid: string, name: string, edit_date = "2026-11-09 09:00:00") => ({
  uuid,
  name,
  edit_date,
});
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;
const seed = () =>
  trigger.poll!({ ...input, state: {} } as never, mockCtx([{ body: [cat("a", "Plumbing")] }]).ctx);

test("new-or-updated-category: first check stores the snapshot without emitting", async () => {
  const r = await seed();
  assertEquals(events(r), []);
  assertEquals((next(r) as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-category: emits only the added row; a retry is identical", async () => {
  const seeded = await seed();
  const rows = [cat("b", "Electrical"), cat("a", "Plumbing")];
  const resp = () => mockCtx([{ body: rows }]).ctx;
  const first = await trigger.poll!({ ...input, state: next(seeded) } as never, resp());
  const retry = await trigger.poll!({ ...input, state: next(seeded) } as never, resp());
  assertEquals(events(first), [{ change: "added", ...cat("b", "Electrical") }]);
  assertEquals(retry, first);
});

test("new-or-updated-category: an edited row is emitted as updated", async () => {
  const seeded = await seed();
  const r = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([{ body: [cat("a", "Plumbing and drainage", "2026-11-10 09:00:00")] }]).ctx,
  );
  assertEquals(events(r), [{
    change: "updated",
    ...cat("a", "Plumbing and drainage", "2026-11-10 09:00:00"),
  }]);
});

test("new-or-updated-category: requests the wrapped list", async () => {
  const c = mockCtx([{ body: [cat("a", "Plumbing")] }]);
  await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  assertEquals(c.calls.length, 1);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(c.calls[0].url, "https://api.servicem8.com/api_1.0/category.json?cursor=-1");
});

test("new-or-updated-category: more than one page of categories is refused, not truncated", async () => {
  const seeded = await seed();
  const c = mockCtx([{ body: [cat("a", "Plumbing")], headers: { "x-next-cursor": "abc" } }]);
  let message = "";
  try {
    await trigger.poll!({ ...input, state: next(seeded) } as never, c.ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(
    message,
    "ServiceM8 returned more than one page of categories; too many to snapshot",
  );
});
