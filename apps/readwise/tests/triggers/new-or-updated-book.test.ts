import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-book.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);
const NOW = 1_700_000_000_000;

async function atNow<T>(run: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => NOW;
  try {
    return await run();
  } finally {
    Date.now = real;
  }
}

test("new-or-updated-book: seeds, emits new rows, retries idempotently, and requests the literal window", async () => {
  const seed = ctx({ results: [] });
  const seeded = await atNow(() => trigger.poll!({ ...input, state: {} }, seed.ctx));
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 0); // seeding records the cursor, it does not read the feed

  const run = ctx({ results: [{ id: 2, updated: "t1" }], next: null });
  const first = await atNow(() => trigger.poll!({ ...input, state: seeded.nextState }, run.ctx));
  const retry = await atNow(() =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      ctx({ results: [{ id: 2, updated: "t1" }], next: null }).ctx,
    )
  );
  assertEquals(first.events.length, 1);
  assertEquals(first.events, [{ id: 2, updated: "t1" }]);
  assertEquals(retry, first);
  assertEquals(run.calls.length, 1);
  assertEquals(run.calls[0].method, "GET");
  assertEquals(
    run.calls[0].url,
    "https://readwise.io/api/v2/books/?updated__gt=2023-11-14T22%3A11%3A20.000Z&page_size=100&page=1",
  );

  // a record already seen by the previous check is not emitted again
  const afterFirst = { ...first, nextState: first.nextState };
  const again = await atNow(() =>
    trigger.poll!(
      { ...input, state: afterFirst.nextState },
      ctx({ results: [{ id: 2, updated: "t1" }], next: null }).ctx,
    )
  );
  assertEquals(again.events, []);
  // an edited record (same id, new update stamp) is a new event
  const edited = await trigger.poll!(
    { ...input, state: afterFirst.nextState },
    ctx({ results: [{ id: 2, updated: "t2" }], next: null }).ctx,
  );
  assertEquals(edited.events.length, 1);
});

test("new-or-updated-book: a window over 3 pages is drained across successive checks, each item once", async () => {
  const all = Array.from(
    { length: 450 },
    (_, i) => ({ id: i, title: "b", updated: "2026-11-09T10:00:00Z" }),
  );
  const c = {
    log() {},
    fetch: (u: string | URL | Request) => {
      const q = new URL(String(u)).searchParams;
      const page = Number(q.get("page")), size = Number(q.get("page_size"));
      const results = all.slice((page - 1) * size, page * size);
      return Promise.resolve(
        new Response(JSON.stringify({ results, next: page * size < all.length ? "more" : null }), {
          headers: { "content-type": "application/json" },
        }),
      );
    },
  } as unknown as Parameters<NonNullable<typeof trigger.poll>>[1];
  let state: unknown = (await atNow(() => trigger.poll!({ ...input, state: {} }, c))).nextState;
  const emitted: string[] = [];
  for (let check = 0; check < 8; check++) {
    const r = await atNow(() => trigger.poll!({ ...input, state }, c));
    for (const e of r.events as Array<{ id: unknown }>) emitted.push(String(e.id));
    state = r.nextState;
  }
  assertEquals(emitted.length, 450);
  assertEquals(new Set(emitted).size, 450);
});
