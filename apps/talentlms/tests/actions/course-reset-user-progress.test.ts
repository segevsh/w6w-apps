import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/course-reset-user-progress.ts";

Deno.test("course-reset-user-progress: GET resetuserprogress and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute(
    { "courseId": 4, "userId": 7, "removeCertification": true },
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.talentlms.com/api/v1/resetuserprogress/course_id:4,user_id:7,remove_certification:yes",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});

Deno.test("course-reset-user-progress: declares idempotent honestly", () => {
  assertEquals(action.idempotent, true);
});
