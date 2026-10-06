import { assertEquals } from "@std/assert";
import action from "../../actions/form-user-assign.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-user-assign: POST /api/v3/forms/4639578/assigned_users with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "ok": 1 } }]);
  const out = await action.execute(
    { "formId": 4639578, "userId": 114, "departmentId": 2 } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/forms/4639578/assigned_users");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), { "user_id": 114, "department_id": 2 });
  assertEquals(out, { "ok": 1 });
});
