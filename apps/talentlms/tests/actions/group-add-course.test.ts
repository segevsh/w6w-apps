import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/group-add-course.ts";

Deno.test("group-add-course: GET addcoursetogroup and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "courseId": 4, "groupId": 2 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.talentlms.com/api/v1/addcoursetogroup/course_id:4,group_id:2",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});

Deno.test("group-add-course: declares idempotent honestly", () => {
  assertEquals(action.idempotent, true);
});
