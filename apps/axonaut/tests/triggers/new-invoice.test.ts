import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newInvoice from "../../triggers/new-invoice.ts";
import newOrUpdatedInvoice from "../../triggers/new-or-updated-invoice.ts";

const page = (id: string, updated_at: string) => ({ body: [{ id, updated_at }] });
const empty = { body: [] };

async function at<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => new Date(iso).getTime();
  try {
    return await fn();
  } finally {
    Date.now = real;
  }
}

test("new-invoice seeds, emits, retries, and requests creation_date_after", async () => {
  const seed = await at(
    "2026-11-09T00:00:00Z",
    () => newInvoice.poll!({ params: {}, state: {} }, mockCtx([page("a", "x"), empty]).ctx),
  );
  assertEquals(seed.events, []);
  assertEquals((seed.nextState as { seeded: boolean }).seeded, true);
  assertEquals((seed.nextState as { cursor: string }).cursor, "2026-11-09T00:00:00.000Z");
  const run = () => {
    const c = mockCtx([page("b", "2026-11-09T00:01:00Z"), empty]);
    return at(
      "2026-11-09T00:05:00Z",
      () => newInvoice.poll!({ params: {}, state: seed.nextState }, c.ctx),
    )
      .then((r) => ({ r, c }));
  };
  const first = await run();
  assertEquals(first.r.events, [{ id: "b", updated_at: "2026-11-09T00:01:00Z" }]);
  const second = await run();
  assertEquals(second.r, first.r);
  const call = first.c.calls[0];
  assertEquals(call.method, "GET");
  assertEquals(
    call.url,
    "https://axonaut.com/api/v2/invoices?creation_date_after=08%2F11%2F2026",
  );
  assertEquals(call.headers.page, "1");
});

test("new-invoice does not flood on an unchanged window", async () => {
  const seed = await at(
    "2026-11-09T00:00:00Z",
    () => newInvoice.poll!({ params: {}, state: {} }, mockCtx([page("a", "x"), empty]).ctx),
  );
  const again = await at(
    "2026-11-09T00:05:00Z",
    () =>
      newInvoice.poll!({ params: {}, state: seed.nextState }, mockCtx([page("a", "x"), empty]).ctx),
  );
  assertEquals(again.events, []);
});

test("new-or-updated-invoice uses the update stamp and updated_after", async () => {
  const seed = await at(
    "2026-11-09T00:00:00Z",
    () =>
      newOrUpdatedInvoice.poll!(
        { params: {}, state: {} },
        mockCtx([page("a", "2026-11-09T00:00:00Z"), empty]).ctx,
      ),
  );
  const c = mockCtx([page("a", "2026-11-09T00:01:00Z"), empty]);
  const result = await at(
    "2026-11-09T00:05:00Z",
    () => newOrUpdatedInvoice.poll!({ params: {}, state: seed.nextState }, c.ctx),
  );
  assertEquals(result.events, [{ id: "a", updated_at: "2026-11-09T00:01:00Z" }]);
  assertEquals(c.calls[0].url, "https://axonaut.com/api/v2/invoices?updated_after=08%2F11%2F2026");
});
