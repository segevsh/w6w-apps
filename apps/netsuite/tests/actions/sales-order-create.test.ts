import { assertEquals, assertRejects } from "@std/assert";
import salesOrderCreate from "../../actions/sales-order-create.ts";
import { BASE, created, mockCtx, run } from "../_helpers.ts";

Deno.test("sales-order-create: nests the lines under item.items with reference fields", async () => {
  const { ctx, calls } = mockCtx([created("salesOrder", "300")]);
  const out = await run(salesOrderCreate, {
    customer: "107",
    location: "1",
    memo: "rush",
    lines: [{ item: { id: "9999" }, amount: 1 }],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/salesOrder`);
  assertEquals(JSON.parse(calls[0].body!), {
    entity: { id: "107" },
    memo: "rush",
    location: { id: "1" },
    item: { items: [{ item: { id: "9999" }, amount: 1 }] },
  });
  assertEquals(out.id, "300");
});

Deno.test("sales-order-create: lines may be a typed JSON string; additionalFields merge in", async () => {
  const { ctx, calls } = mockCtx([created("salesOrder", "1")]);
  await run(salesOrderCreate, {
    customer: "5",
    externalId: "SO-1",
    lines: '[{"item":{"id":"1"},"amount":2}]',
    additionalFields: '{"custbody_po":"PO-9"}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    entity: { id: "5" },
    externalId: "SO-1",
    item: { items: [{ item: { id: "1" }, amount: 2 }] },
    custbody_po: "PO-9",
  });
});

Deno.test("sales-order-create: empty or non-array lines are refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await run(salesOrderCreate, { customer: "5", lines: [] }, ctx),
    Error,
    "non-empty",
  );
  await assertRejects(
    async () => await run(salesOrderCreate, { customer: "5", lines: { a: 1 } }, ctx),
    Error,
    "non-empty",
  );
  assertEquals(calls.length, 0);
});
