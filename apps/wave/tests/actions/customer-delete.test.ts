import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import customerDelete from "../../actions/customer-delete.ts";

test("customer-delete: succeeds and returns didSucceed", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { customerDelete: { didSucceed: true, inputErrors: [] } } },
  }]);
  const out = await customerDelete.execute({ customerId: "c1" }, ctx) as { didSucceed: boolean };
  assertEquals(out.didSucceed, true);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.input, { id: "c1" });
});

test("customer-delete: a customer with existing invoices is rejected via inputErrors", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        customerDelete: {
          didSucceed: false,
          inputErrors: [{
            code: "REFERENCED",
            message: "Customer has existing invoices.",
            path: ["input", "id"],
          }],
        },
      },
    },
  }]);
  let threw = false;
  try {
    await customerDelete.execute({ customerId: "c1" }, ctx);
  } catch (e) {
    threw = true;
    if (!(e as Error).message.includes("existing invoices")) throw e;
  }
  if (!threw) throw new Error("expected a rejection");
});

test("customer-delete: type/resource/idempotency metadata", () => {
  assertEquals(customerDelete.type, "perform");
  assertEquals(customerDelete.resource, "customer");
  assertEquals(customerDelete.idempotent, true);
});
