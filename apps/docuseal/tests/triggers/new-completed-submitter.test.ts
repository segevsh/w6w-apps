import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-completed-submitter.ts";
import { clock } from "../../lib/triggers.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string, at: string) => ({ id, completed_at: at });
const wrap = (items: unknown[]) => ({ data: items, pagination: { next: null } });
const OLD = "2023-11-14T22:12:00.000Z";
const NEW = "2023-11-14T22:14:00.000Z";

test("new-completed-submitter: seeds, emits only new items, retries idempotently, and sends the created-after filter", async () => {
  const original = clock.now;
  clock.now = () => 1_700_000_000_000;
  try {
    const seed = mockCtx([]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    // §9.9: the seed reads nothing.
    assertEquals(seed.calls.length, 0);
    assertEquals((seeded.nextState as { floor?: number }).floor, 1_700_000_000_000);

    const page = [item("b", NEW), item("a", OLD)];
    const firstCtx = mockCtx([{ body: wrap(page) }]);
    const first = await trigger.poll!(
      { ...input, state: seeded.nextState },
      firstCtx.ctx,
    );
    assertEquals(firstCtx.calls[0].method, "GET");
    const url = new URL(firstCtx.calls[0].url);
    assertEquals(url.origin + url.pathname, "https://api.docuseal.com/submitters");
    assertEquals(Object.fromEntries(url.searchParams), {
      completed_after: "2023-11-14T22:11:20.000Z",
      limit: "100",
    });

    const retry = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: wrap(page) }]).ctx,
    );
    assertEquals(first.events, [item("b", NEW)]);
    assertEquals(retry, first);
  } finally {
    clock.now = original;
  }
});

// A vendor that honours `completed_after`, `after` and `limit` (ids ascending, `pagination.next`
// is the last id of the page), so a restart from page 1 cannot hide a stall.
const vendor = (all: Array<{ id: number; completed_at: string }>) =>
  ({
    log: () => {},
    connection: { display: {} },
    fetch: (input: RequestInfo | URL) => {
      const url = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      );
      const after = Number(url.searchParams.get("after") ?? 0);
      const since = Date.parse(url.searchParams.get("completed_after") ?? "") || 0;
      const limit = Number(url.searchParams.get("limit") ?? 10);
      const rows = all.filter((r) => r.id > after && Date.parse(r.completed_at) >= since);
      const data = rows.slice(0, limit);
      const next = data.length === limit && rows.length > limit ? data[data.length - 1].id : null;
      return Promise.resolve(
        new Response(JSON.stringify({ data, pagination: { next } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    },
  }) as unknown as Parameters<NonNullable<typeof trigger.poll>>[1];

const T0 = 1_700_000_000_000;

// Brief §9.8: a window far larger than the old seen window (1100+) drains once, none twice.

test("new-completed-submitter: a 1200-submitter window drains across checks, each once, then the cursor moves", async () => {
  const original = clock.now;
  let now = T0;
  clock.now = () => now;
  const ITEMS = Array.from({ length: 1200 }, (_, n) => ({
    id: n + 1,
    completed_at: new Date(T0 - 100_000 + n * 50).toISOString(),
  }));
  const ctx = vendor(ITEMS);
  try {
    let state: unknown = {
      ...((await trigger.poll!({ ...input, state: {} }, ctx)).nextState as object),
      cursor: T0 - 200_000,
      floor: T0 - 200_000,
    };
    const emitted: string[] = [];
    let drained = -1;
    for (let check = 0; check < 40; check++) {
      now += 300_000;
      const out = await trigger.poll!({ ...input, state }, ctx);
      state = out.nextState;
      emitted.push(...out.events.map((e) => String((e as { id: unknown }).id)));
      if (!(state as { resume?: unknown }).resume && emitted.length >= 1200 && drained < 0) {
        drained = check;
      }
    }
    assertEquals(emitted.length, 1200);
    assertEquals(new Set(emitted).size, 1200);
    assertEquals((state as { resume?: unknown }).resume, undefined);
    assertEquals((state as { cursor: number }).cursor, now);
    assertEquals(drained >= 0, true);
  } finally {
    clock.now = original;
  }
});

// Brief §9.9: seed -> []; a pre-seed window of more than maxPages pages -> []; a post-seed one -> it.

test("new-completed-submitter: pre-seed submitters are never emitted, a post-seed one is", async () => {
  const original = clock.now;
  let now = T0;
  clock.now = () => now;
  const ITEMS = Array.from({ length: 400 }, (_, n) => ({
    id: n + 1,
    completed_at: new Date(T0 - 100_000 + n * 100).toISOString(),
  }));
  const ctx = vendor(ITEMS);
  try {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx);
    assertEquals(seeded.events, []);
    let state: unknown = seeded.nextState;
    const emitted: string[] = [];
    const run = async (checks: number) => {
      for (let check = 0; check < checks; check++) {
        now += 1_000;
        const out = await trigger.poll!({ ...input, state }, ctx);
        state = out.nextState;
        emitted.push(...out.events.map((e) => String((e as { id: unknown }).id)));
      }
    };
    await run(6);
    assertEquals(emitted, []);
    ITEMS.push({ id: 401, completed_at: new Date(T0 + 500).toISOString() });
    await run(6);
    assertEquals(emitted, ["401"]);
  } finally {
    clock.now = original;
  }
});
