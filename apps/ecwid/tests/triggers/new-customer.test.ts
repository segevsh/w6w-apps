import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";

const page = (items: unknown[]) => ({
  body: { items, total: items.length, count: items.length, offset: 0, limit: 100 },
});

test("new-customer seeds, emits unseen customers, retries idempotently, and requests newest first", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} } as never,
    mockCtx([page([{ id: 1 }])]).ctx,
  ) as never as { events: unknown[]; nextState: unknown };
  assertEquals(seeded.events, []);
  const nextCtx = mockCtx([page([{ id: 2 }, { id: 1 }])]);
  const next = await trigger.poll!({ params: {}, state: seeded.nextState } as never, nextCtx.ctx);
  assertEquals((next as never as { events: unknown[] }).events, [{ id: 2 }]);
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockCtx([page([{ id: 2 }, { id: 1 }])]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://app.ecwid.com/api/v3/__storeId__/customers?sortBy=REGISTERED_DATE_DESC&limit=100&offset=0",
  );
});
