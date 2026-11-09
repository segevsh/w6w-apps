import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-purchase.ts";

const page = (purchase_list: unknown[]) => ({ body: envelope({ purchase_list }) });

test("new-purchase seeds, emits unseen purchases, retries idempotently, and requests newest first", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} } as never,
    mockCtx([page([{ purchase_id: "a" }])]).ctx,
  ) as never as { events: unknown[]; nextState: unknown };
  assertEquals(seeded.events, []);
  const nextCtx = mockCtx([page([{ purchase_id: "b" }, { purchase_id: "a" }])]);
  const next = await trigger.poll!({ params: {}, state: seeded.nextState } as never, nextCtx.ctx);
  assertEquals((next as never as { events: unknown[] }).events, [{ purchase_id: "b" }]);
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockCtx([page([{ purchase_id: "b" }, { purchase_id: "a" }])]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://www.digistore24.com/api/call/listPurchases?sort_by=date&sort_order=desc&page_no=1&page_size=100",
  );
});
