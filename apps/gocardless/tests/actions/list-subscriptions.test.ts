import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import listSubscriptions from "../../actions/list-subscriptions.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const page = listEnvelope("subscriptions", [{ id: "SB1", status: "active" }]);

test("list-subscriptions: GET /subscriptions", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  const out = await listSubscriptions.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/subscriptions");
  assertEquals(out.items.length, 1);
});

test("list-subscriptions: mandate, customer, status and created_at filters", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  await listSubscriptions.execute!({
    limit: 5,
    before: "B1",
    mandate: "MD1",
    customer: "CU1",
    status: "active",
    createdAtLt: "2026-06-01T00:00:00Z",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    limit: "5",
    before: "B1",
    mandate: "MD1",
    customer: "CU1",
    status: "active",
    "created_at[lt]": "2026-06-01T00:00:00Z",
  });
});
