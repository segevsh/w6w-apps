import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/category-get.ts";

Deno.test("category-get: GET categories and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "categoryId": 3 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/categories/id:3");
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});
