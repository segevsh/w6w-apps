import { test } from "node:test";
import assert from "node:assert/strict";
const assertEquals = (a: unknown, b: unknown) => assert.deepEqual(a, b);
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-return.ts";
import { clock } from "../../lib/triggers.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string, at: string) => ({ id, returnedAt: at });
const wrap = (items: unknown[]) => ({
  data: {
    viewer: {
      returns: {
        totalCount: items.length,
        pageInfo: { endCursor: null, hasNextPage: false },
        edges: items.map((node) => ({ node })),
      },
    },
  },
});
const OLD = "2023-11-14T22:12:00.000Z";
const NEW = "2023-11-14T22:13:00.000Z";

test("new-return: seeds, emits only new items, retries idempotently, and sends the created-after filter", async () => {
  const original = clock.now;
  clock.now = () => 1_700_000_000_000;
  try {
    const seed = mockCtx([{ body: wrap([item("a", OLD)]) }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(seed.calls[0].url, "https://partners-endpoint.dice.fm/graphql");
    assertEquals(JSON.parse(seed.calls[0].body!).variables, {
      first: 100,
      where: { returnedAt: { gte: "2023-11-14T22:11:20.000Z" } },
    });

    const page = [item("b", NEW), item("a", OLD)];
    const first = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: wrap(page) }]).ctx,
    );
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

// Brief §9.8: a window of maxPages + 1 full pages is walked across checks from a persisted
// position; every item is emitted exactly once and the cursor moves only after the drain.

test("new-return: a window of maxPages + 1 full pages drains across checks, each item once", async () => {
  const original = clock.now;
  clock.now = () => 1_700_000_000_000;
  const ITEMS = Array.from({ length: 400 }, (_, n) => ({
    id: `i${n}`,
    returnedAt: new Date(1_700_000_000_000 - 100_000 + n * 100).toISOString(),
  }));
  const ctx = {
    log: () => {},
    connection: { display: {} },
    fetch: (_input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof _input === "string"
        ? _input
        : _input instanceof URL
        ? _input.toString()
        : _input.url;
      const vars = JSON.parse(String(init?.body)).variables as { first: number; after?: string };
      const start = vars.after ? Number(vars.after) : 0;
      const slice = ITEMS.slice(start, start + vars.first);
      const end = start + slice.length;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              viewer: {
                returns: {
                  totalCount: ITEMS.length,
                  pageInfo: { endCursor: String(end), hasNextPage: end < ITEMS.length },
                  edges: slice.map((node) => ({ node })),
                },
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    },
  } as unknown as Parameters<NonNullable<typeof trigger.poll>>[1];
  try {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx);
    let state: unknown = {
      ...(seeded.nextState as object),
      cursor: 1_700_000_000_000 - 200_000,
      ids: [],
    };
    const emitted: string[] = [];
    let resumed = false;
    for (let check = 0; check < 12; check++) {
      const out = await trigger.poll!({ ...input, state }, ctx);
      state = out.nextState;
      emitted.push(...out.events.map((e) => String((e as { id: unknown }).id)));
      if ((state as { resume?: unknown }).resume) resumed = true;
      if (emitted.length === 400 && !(state as { resume?: unknown }).resume) break;
    }
    assertEquals(resumed, true);
    assertEquals(emitted.length, 400);
    assertEquals(new Set(emitted).size, 400);
    assertEquals((state as { resume?: unknown }).resume, undefined);
    assertEquals((state as { cursor: number }).cursor, 1_700_000_000_000);
  } finally {
    clock.now = original;
  }
});
