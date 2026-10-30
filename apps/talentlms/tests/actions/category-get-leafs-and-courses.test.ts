import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/category-get-leafs-and-courses.ts";

test("category-get-leafs-and-courses: GET categoryleafsandcourses and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "categoryId": 2 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/categoryleafsandcourses/id:2");
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});
