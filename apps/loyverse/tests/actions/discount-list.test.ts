import { assertEquals } from "@std/assert";
import action from "../../actions/discount-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("discount-list: GET /discounts maps params to the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: { discounts: [{ id: "a" }], cursor: "c2" } }]);
  const out = await action.execute({ discountIds: "d1", showDeleted: true }, ctx) as {
    discounts: unknown[];
    cursor?: string;
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/discounts");
  assertEquals(queryOf(calls[0].url), { discount_ids: "d1", show_deleted: "true" });
  assertEquals(out.discounts.length, 1);
  assertEquals(out.cursor, "c2");
});

Deno.test("discount-list: no params sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { discounts: [] } }]);
  const out = await action.execute({}, ctx) as { cursor?: string };
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.cursor, undefined);
});
