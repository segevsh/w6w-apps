import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/course-delete.ts";

Deno.test("course-delete: POST deletecourse and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "courseId": 9, "deletedByUserId": 1 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/deletecourse");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "course_id=9&deleted_by_user_id=1");
  assertEquals(out, { ok: "yes" });
});

Deno.test("course-delete: declares idempotent honestly", () => {
  assertEquals(action.idempotent, true);
});
