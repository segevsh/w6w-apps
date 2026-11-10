import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-order.ts";

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

test("new-order: seeds, emits new rows, retries idempotently, and requests the literal window", async () => {
  const seed = ctx({ items: [] });
  const seeded = await atNow(() => trigger.poll!({ ...input, state: {} }, seed.ctx));
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 0); // seeding records the cursor, it does not read the feed

  const run = ctx({ items: [{ id: "order_1", created_at: 1700000001 }] });
  const first = await atNow(() => trigger.poll!({ ...input, state: seeded.nextState }, run.ctx));
  const retry = await atNow(() =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      ctx({ items: [{ id: "order_1", created_at: 1700000001 }] }).ctx,
    )
  );
  assertEquals(first.events.length, 1);
  assertEquals(first.events, [{ id: "order_1", created_at: 1700000001 }]);
  assertEquals(retry, first);
  assertEquals(run.calls.length, 1);
  assertEquals(run.calls[0].method, "GET");
  assertEquals(
    run.calls[0].url,
    "https://api.razorpay.com/v1/orders?from=1699999880&count=100&skip=0",
  );

  // a record already seen by the previous check is not emitted again
  const afterFirst = { ...first, nextState: first.nextState };
  const again = await atNow(() =>
    trigger.poll!(
      { ...input, state: afterFirst.nextState },
      ctx({ items: [{ id: "order_1", created_at: 1700000001 }] }).ctx,
    )
  );
  assertEquals(again.events, []);
});

test("new-order: a window over 3 pages is drained across successive checks, each item once", async () => {
  const all = Array.from({ length: 450 }, (_, i) => ({ id: "o" + i, created_at: 1700000001 + i }));
  const c = {
    log() {},
    fetch: (u: string | URL | Request) => {
      const q = new URL(String(u)).searchParams;
      const skip = Number(q.get("skip")), count = Number(q.get("count"));
      const items = all.slice(skip, skip + count);
      return Promise.resolve(
        new Response(JSON.stringify({ entity: "collection", count: items.length, items }), {
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
