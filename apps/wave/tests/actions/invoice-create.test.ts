import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import invoiceCreate from "../../actions/invoice-create.ts";

test("invoice-create: single-item convenience builds a one-element items array", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        invoiceCreate: {
          didSucceed: true,
          inputErrors: [],
          invoice: { id: "inv1", invoiceNumber: "INV-001" },
        },
      },
    },
  }]);
  const out = await invoiceCreate.execute(
    { businessId: "b1", customerId: "c1", productId: "p1", quantity: 3 },
    ctx,
  ) as { invoice: { id: string } };
  assertEquals(out.invoice.id, "inv1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.input.items, [{ productId: "p1", quantity: 3 }]);
});

test("invoice-create: an explicit `items` JSON array overrides the single-item fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: { invoiceCreate: { didSucceed: true, inputErrors: [], invoice: { id: "inv1" } } },
    },
  }]);
  await invoiceCreate.execute(
    {
      businessId: "b1",
      customerId: "c1",
      productId: "ignored",
      items: [{ productId: "p2", quantity: 5 }],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.input.items, [{ productId: "p2", quantity: 5 }]);
});

test("invoice-create: a rejected create throws with field-level detail", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        invoiceCreate: {
          didSucceed: false,
          inputErrors: [{ code: "REQUIRED", message: "Required.", path: ["input", "customerId"] }],
          invoice: null,
        },
      },
    },
  }]);
  let threw = false;
  try {
    await invoiceCreate.execute({ businessId: "b1", customerId: "" }, ctx);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("expected a rejection");
});

test("invoice-create: type/resource/idempotency metadata", () => {
  assertEquals(invoiceCreate.type, "perform");
  assertEquals(invoiceCreate.resource, "invoice");
  assertEquals(invoiceCreate.idempotent, false);
});
