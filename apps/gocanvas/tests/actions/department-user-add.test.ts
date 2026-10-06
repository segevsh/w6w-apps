import { assertEquals } from "@std/assert";
import action from "../../actions/department-user-add.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("department-user-add: POST /api/v3/departments/1999/users with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "type": "department_user", "user_id": 5491 } }]);
  const out = await action.execute(
    { "departmentId": 1999, "userId": 5491, "departmentRole": "department_user" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/departments/1999/users");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), { "user_id": 5491, "department_role": "department_user" });
  assertEquals(out, { "type": "department_user", "user_id": 5491 });
});
