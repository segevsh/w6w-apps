import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/course-custom-fields-get.ts";

Deno.test("course-custom-fields-get: GET getcustomcoursefields and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/getcustomcoursefields");
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});
