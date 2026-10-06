import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/course-get-user-status.ts";

Deno.test("course-get-user-status: GET getuserstatusincourse and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "courseId": 4, "userId": 7 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.talentlms.com/api/v1/getuserstatusincourse/course_id:4,user_id:7",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});
