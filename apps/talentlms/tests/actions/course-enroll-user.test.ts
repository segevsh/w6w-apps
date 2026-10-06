import { assertEquals, assertRejects } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/course-enroll-user.ts";

Deno.test("course-enroll-user: POST addusertocourse and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({
    "userEmail": "ann@example.com",
    "courseId": 4,
    "role": "instructor",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/addusertocourse");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "user_email=ann%40example.com&course_id=4&role=instructor");
  assertEquals(out, { ok: "yes" });
});

Deno.test("course-enroll-user: declares idempotent honestly", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("course-enroll-user: refuses a call that names no user or no course", async () => {
  const { ctx, calls } = mockTalentLmsCtx();
  await assertRejects(
    async () => await action.execute({ courseId: 4 }, ctx),
    Error,
    "user ID or a user email",
  );
  await assertRejects(
    async () => await action.execute({ userId: 7 }, ctx),
    Error,
    "course ID or a course name",
  );
  assertEquals(calls.length, 0);
});
