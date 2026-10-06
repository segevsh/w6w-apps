import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/course-create.ts";

Deno.test("course-create: POST createcourse and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({
    "name": "Safety 101",
    "categoryId": 3,
    "customFields": { "1": "ops" },
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/createcourse");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "name=Safety+101&category_id=3&custom_field_1=ops");
  assertEquals(out, { ok: "yes" });
});

Deno.test("course-create: declares idempotent honestly", () => {
  assertEquals(action.idempotent, false);
});
