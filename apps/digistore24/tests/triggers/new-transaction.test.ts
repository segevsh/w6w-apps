import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-transaction.ts";

const page = (transaction_list: unknown[]) => ({ body: envelope({ transaction_list }) });

test("new-transaction seeds, emits unseen transactions, retries idempotently, and sorts newest first", async () => {
  const seeded = await trigger.poll!({ params: {}, state: {} }, mockCtx([page([{ id: 1 }])]).ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const nextCtx = mockCtx([page([{ id: 2 }, { id: 1 }])]);
  const next = await trigger.poll!({ params: {}, state: seeded.nextState }, nextCtx.ctx);
  assertEquals(next.events, [{ id: 2 }]);
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([page([{ id: 2 }, { id: 1 }])]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(nextCtx.calls[0].method, "GET");
  assertEquals(
    nextCtx.calls[0].url,
    "https://www.digistore24.com/api/call/listTransactions?sort_by=date&sort_order=desc&page_no=1&page_size=100",
  );
});

test("new-transaction sends its filters", async () => {
  const m = mockCtx([page([])]);
  await trigger.poll!(
    { params: { email: "a@example.com", transaction_type: "refund" }, state: {} },
    m.ctx,
  );
  assertEquals(
    m.calls[0].url,
    "https://www.digistore24.com/api/call/listTransactions?sort_by=date&sort_order=desc&page_no=1&page_size=100&search%5Bemail%5D=a%40example.com&search%5Btransaction_type%5D=refund",
  );
});
