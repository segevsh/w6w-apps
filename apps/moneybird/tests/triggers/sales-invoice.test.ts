import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockMoneybirdCtx, pathOf, queryOf } from "../_helpers.ts";
import newInvoice from "../../triggers/new-sales-invoice.ts";
import updatedInvoice from "../../triggers/new-or-updated-sales-invoice.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
const t0 = Date.parse("2026-11-10T12:00:00Z");
const at = (ms: number) => {
  clock.now = () => ms;
};
const inv = (
  id: string,
  updated = "2026-11-10T10:00:00.000Z",
  created = updated,
) => ({ id, created_at: created, updated_at: updated });
const poll = (
  trigger: typeof newInvoice,
  state: unknown,
  records: unknown[],
) => {
  const mock = mockMoneybirdCtx([{ body: records }]);
  return { mock, result: trigger.poll!({ params: {}, state, subscriptionId: "sub-1" }, mock.ctx) };
};

test("new-sales-invoice: seeds, emits only new invoices, retries idempotently", async () => {
  at(t0);
  const seeded = await poll(newInvoice, {}, [inv("1")]).result;
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  at(t0 + 300_000);
  // "1" existed before the first check (its stamp is before the floor); "2" was created after it.
  const fresh = inv("2", "2026-11-10T12:01:00.000Z");
  const first = poll(newInvoice, seeded.nextState, [fresh, inv("1")]);
  const retry = poll(newInvoice, seeded.nextState, [fresh, inv("1")]);
  assertEquals((await first.result).events, [fresh]);
  assertEquals(await retry.result, await first.result);
});

test("new-sales-invoice: requests sales_invoices.json with created_after = cursor - 10 min", async () => {
  at(t0);
  const seeded = await poll(newInvoice, {}, []).result;
  const next = poll(newInvoice, seeded.nextState, []);
  await next.result;
  assertEquals(next.mock.calls[0].method, "GET");
  assertEquals(pathOf(next.mock.calls[0].url), "/api/v2/123/sales_invoices.json");
  assertEquals(queryOf(next.mock.calls[0].url), {
    filter: "created_after:2026-11-10T11:50:00Z",
    page: "1",
    per_page: "100",
  });
});

test("new-or-updated-sales-invoice: an edit is a new event (idOf includes updated_at)", async () => {
  at(t0);
  const seeded = await poll(updatedInvoice, {}, [inv("1", "2026-11-10T09:00:00.000Z")]).result;
  assertEquals(seeded.events, []);
  at(t0 + 300_000);
  const edited = inv("1", "2026-11-10T12:02:00.000Z");
  const first = poll(updatedInvoice, seeded.nextState, [
    edited,
    inv("1", "2026-11-10T09:00:00.000Z"),
  ]);
  const retry = poll(updatedInvoice, seeded.nextState, [
    edited,
    inv("1", "2026-11-10T09:00:00.000Z"),
  ]);
  assertEquals((await first.result).events, [edited]);
  assertEquals(await retry.result, await first.result);
  // unchanged invoice is not re-emitted
  const again = await poll(updatedInvoice, (await first.result).nextState, [edited]).result;
  assertEquals(again.events, []);
});

test("new-or-updated-sales-invoice: requests updated_after = cursor - 10 min", async () => {
  at(t0);
  const seeded = await poll(updatedInvoice, {}, []).result;
  const next = poll(updatedInvoice, seeded.nextState, []);
  await next.result;
  assertEquals(pathOf(next.mock.calls[0].url), "/api/v2/123/sales_invoices.json");
  assertEquals(queryOf(next.mock.calls[0].url), {
    filter: "updated_after:2026-11-10T11:50:00Z",
    page: "1",
    per_page: "100",
  });
});
