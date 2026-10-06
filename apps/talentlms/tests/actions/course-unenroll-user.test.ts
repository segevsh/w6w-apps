import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/course-unenroll-user.ts";

Deno.test("course-unenroll-user: GET removeuserfromcourse and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "userId": 7, "courseId": 4 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.talentlms.com/api/v1/removeuserfromcourse/user_id:7,course_id:4",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});

Deno.test("course-unenroll-user: declares idempotent honestly", () => {
  assertEquals(action.idempotent, true);
});
