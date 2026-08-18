import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-adjustment-create.ts";

const display = {};

Deno.test("invoice-adjustment-create: posts contract, category and amount", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: {} } }], { display });
  await action.execute!({ contractId: "c1", categoryId: "cat1", amount: 250 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/invoice-adjustments");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { contract_id: "c1", category_id: "cat1", amount: 250 },
  });
});

/** Money moves, so a retry would pay twice. */
Deno.test("invoice-adjustment-create: is honestly non-idempotent", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("invoice-adjustment-create: contract, category and amount are all required", async () => {
  for (
    const patch of [
      { categoryId: "cat1", amount: 1 },
      { contractId: "c1", amount: 1 },
      { contractId: "c1", categoryId: "cat1" },
    ]
  ) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(async () => await action.execute!(patch, ctx), Error);
    assertEquals(calls.length, 0);
  }
});
