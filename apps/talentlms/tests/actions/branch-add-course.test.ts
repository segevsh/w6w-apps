import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/branch-add-course.ts";

test("branch-add-course: GET addcoursetobranch and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "courseId": 4, "branchId": 2 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.talentlms.com/api/v1/addcoursetobranch/course_id:4,branch_id:2",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});

test("branch-add-course: declares idempotent honestly", () => {
  assertEquals(action.idempotent, true);
});
