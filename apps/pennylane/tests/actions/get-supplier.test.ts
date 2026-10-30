import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-supplier.ts";

test("get-supplier: GETs /suppliers/{id}", async () => {
  const supplier = { id: 3, name: "Papeterie SARL", reg_no: "123456789" };
  const { ctx, calls } = mockCtx([{ body: supplier }]);
  const res = await action.execute({ id: "3" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/suppliers/3");
  assertEquals(res, supplier);
});

test("get-supplier: takes the id as a string without re-encoding it", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "12345" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/suppliers/12345");
});
