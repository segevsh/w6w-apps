import { assertEquals } from "@std/assert";
import action from "../../actions/payment-type-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("payment-type-list: GET /payment_types maps params to the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: { payment_types: [{ id: "a" }], cursor: "c2" } }]);
  const out = await action.execute({ paymentTypeIds: "p1" }, ctx) as {
    payment_types: unknown[];
    cursor?: string;
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/payment_types");
  assertEquals(queryOf(calls[0].url), { payment_type_ids: "p1" });
  assertEquals(out.payment_types.length, 1);
  assertEquals(out.cursor, "c2");
});

Deno.test("payment-type-list: no params sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { payment_types: [] } }]);
  const out = await action.execute({}, ctx) as { cursor?: string };
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.cursor, undefined);
});
