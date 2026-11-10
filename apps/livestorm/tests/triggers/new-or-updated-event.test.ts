import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-event.ts";
import { clock } from "../../lib/since.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string, updated: number) => ({
  id,
  type: "events",
  attributes: { updated_at: updated },
});
const ctx = (items: unknown[]) => mockCtx([{ body: { data: items } }]);
const NOW = 1_794_700_000_000;
clock.now = () => NOW;

test("new-or-updated-event: seeds, emits new, retries idempotently, filters updated_since", async () => {
  const seed = ctx([item("a", 1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const request = new URL(seed.calls[0].url);
  assertEquals({
    method: seed.calls[0].method,
    path: request.pathname,
    query: Object.fromEntries(request.searchParams),
  }, {
    method: "GET",
    path: "/v1/events",
    query: { "filter[updated_since]": "1794699880", "page[number]": "0", "page[size]": "100" },
  });
  const page = [item("b", 5), item("a", 1)];
  const later = { ...input, state: seeded.nextState };
  const first = await trigger.poll!(later, ctx(page).ctx);
  const retry = await trigger.poll!(later, ctx(page).ctx);
  assertEquals(first.events, [item("b", 5)]);
  assertEquals(retry, first);
});

test("new-or-updated-event: an edited record (same id, newer updated_at) is emitted", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a", 1)]).ctx);
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item("a", 2)]).ctx,
  );
  assertEquals(edited.events, [item("a", 2)]);
  const same = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item("a", 1)]).ctx,
  );
  assertEquals(same.events, []);
});
