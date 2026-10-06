import { assertEquals } from "@std/assert";
import action from "../../actions/bank-list.ts";
import { LIST_META, mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

Deno.test("bank-list: filters by country, currency and type", async () => {
  const banks = [{ name: "Access Bank", code: "044" }];
  const { ctx, calls } = mockCtx([{ body: ok(banks, LIST_META) }]);
  assertEquals(await action.execute({ country: "nigeria", currency: "NGN", type: "nuban" }, ctx), {
    items: banks,
    meta: LIST_META,
  });
  assertEquals(pathOf(calls[0].url), "/bank");
  assertEquals(queryOf(calls[0].url), { country: "nigeria", currency: "NGN", type: "nuban" });
});
