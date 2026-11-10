import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-completed-submitter.ts";
import { clock } from "../../lib/triggers.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string, at: string) => ({ id, completed_at: at });
const wrap = (items: unknown[]) => ({ data: items, pagination: { next: null } });
const OLD = "2023-11-14T22:12:00.000Z";
const NEW = "2023-11-14T22:13:00.000Z";

test("new-completed-submitter: seeds, emits only new items, retries idempotently, and sends the created-after filter", async () => {
  const original = clock.now;
  clock.now = () => 1_700_000_000_000;
  try {
    const seed = mockCtx([{ body: wrap([item("a", OLD)]) }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    const url = new URL(seed.calls[0].url);
    assertEquals(url.origin + url.pathname, "https://api.docuseal.com/submitters");
    assertEquals(Object.fromEntries(url.searchParams), {
      completed_after: "2023-11-14T22:11:20.000Z",
      limit: "100",
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
