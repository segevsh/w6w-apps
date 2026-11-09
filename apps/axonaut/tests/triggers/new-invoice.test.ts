import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newInvoice from "../../triggers/new-invoice.ts";
import newOrUpdatedInvoice from "../../triggers/new-or-updated-invoice.ts";

const page = (id: string, updated_at: string) => ({ body: [{ id, updated_at }] });

test("new-invoice seeds, emits, retries, and requests date_after", async () => {
  const seed = await newInvoice.poll!(
    { params: {}, state: {} },
    mockCtx([page("a", "2026-11-09T00:00:00Z")]).ctx,
  );
  assertEquals(seed.events, []);
  const nextCtx = mockCtx([page("b", "2026-11-09T00:01:00Z")]);
  const next = await newInvoice.poll!({ params: {}, state: seed.nextState }, nextCtx.ctx);
  assertEquals(next.events, [{ id: "b", updated_at: "2026-11-09T00:01:00Z" }]);
  const retry = await newInvoice.poll!(
    { params: {}, state: seed.nextState },
    mockCtx([page("b", "2026-11-09T00:01:00Z")]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(new URL(nextCtx.calls[0].url).pathname, "/api/v2/invoices");
  assertEquals(
    new URL(nextCtx.calls[0].url).searchParams.get("date_after"),
    "2026-11-08T23:58:00.000Z",
  );
});

test("new-or-updated-invoice uses the update stamp in its event identity", async () => {
  const seed = await newOrUpdatedInvoice.poll!(
    { params: {}, state: {} },
    mockCtx([page("a", "2026-11-09T00:00:00Z")]).ctx,
  );
  const result = await newOrUpdatedInvoice.poll!(
    { params: {}, state: seed.nextState },
    mockCtx([page("a", "2026-11-09T00:01:00Z")]).ctx,
  );
  assertEquals(result.events, [{ id: "a", updated_at: "2026-11-09T00:01:00Z" }]);
});
