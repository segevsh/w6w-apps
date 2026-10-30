import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import customerUpdate from "../../actions/customer-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("customer-update: patches given fields only", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cst_1", name: "Ada Lovelace" } }]);
  await customerUpdate.execute({ customerId: "cst_1", name: "Ada Lovelace" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "Ada Lovelace" });
});

test("customer-update: is idempotent", () => {
  assertEquals(customerUpdate.idempotent, true);
});
