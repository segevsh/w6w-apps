import { test } from "node:test";
import assert from "node:assert/strict";
const assertEquals = (a: unknown, b: unknown) => assert.deepEqual(a, b);
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-ticket-transfer.ts";
import { clock } from "../../lib/triggers.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string, at: string) => ({ id, transferredAt: at });
const wrap = (items: unknown[]) => ({
  data: {
    viewer: {
      ticketTransfers: {
        totalCount: items.length,
        pageInfo: { endCursor: null, hasNextPage: false },
        edges: items.map((node) => ({ node })),
      },
    },
  },
});
const OLD = "2023-11-14T22:12:00.000Z";
const NEW = "2023-11-14T22:13:00.000Z";

test("new-ticket-transfer: seeds, emits only new items, retries idempotently, and sends the created-after filter", async () => {
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
      where: { transferredAt: { gte: "2023-11-14T22:11:20.000Z" } },
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
