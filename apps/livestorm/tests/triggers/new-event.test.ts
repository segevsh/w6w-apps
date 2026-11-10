import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event.ts";
import { clock } from "../../lib/since.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id, type: "events", attributes: { title: id } });
const ctx = (ids: string[]) => mockCtx([{ body: { data: ids.map(item) } }]);
const NOW = 1_794_700_000_000;
clock.now = () => NOW;

test("new-event: seeds, emits only new items, retries idempotently, requests created_since", async () => {
  const seed = ctx(["a"]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals((seeded.nextState as { cursor?: number }).cursor, NOW);
  const request = new URL(seed.calls[0].url);
  assertEquals({
    method: seed.calls[0].method,
    path: request.pathname,
    query: Object.fromEntries(request.searchParams),
  }, {
    method: "GET",
    path: "/v1/events",
    // (1794700000000 - 120000) ms as unix seconds; page index starts at 0.
    query: { "filter[created_since]": "1794699880", "page[number]": "0", "page[size]": "100" },
  });

  const later = { ...input, state: seeded.nextState };
  const first = await trigger.poll!(later, ctx(["b", "a"]).ctx);
  const retry = await trigger.poll!(later, ctx(["b", "a"]).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

test("new-event: the next check filters from the stored cursor, not from the epoch", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx(["a"]).ctx);
  clock.now = () => NOW + 600_000;
  try {
    const next = ctx(["b"]);
    await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
    assertEquals(
      new URL(next.calls[0].url).searchParams.get("filter[created_since]"),
      // cursor (the seed check at NOW) - 120 s; a clock-based filter would say 1794700480.
      "1794699880",
    );
  } finally {
    clock.now = () => NOW;
  }
});

test("new-event: pages past a full page (0-indexed) until a short page", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx(["a"]).ctx);
  const full = Array.from({ length: 100 }, (_, i) => `p${i}`);
  const c = mockCtx([{ body: { data: full.map(item) } }, { body: { data: [item("last")] } }]);
  const res = await trigger.poll!({ ...input, state: seeded.nextState }, c.ctx);
  assertEquals(res.events.length, 101);
  assertEquals(new URL(c.calls[1].url).searchParams.get("page[number]"), "1");
});
