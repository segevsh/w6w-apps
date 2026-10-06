import { assertEquals } from "@std/assert";
import action from "../../actions/category-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("category-list: GETs categories", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "software", name: "Software" }] }]);
  const out = await action.execute!({ companyId: "c1" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/categories");
  assertEquals(out, { categories: [{ id: "software", name: "Software" }] });
});
