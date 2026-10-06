import { assertEquals } from "@std/assert";
import action from "../../actions/user-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-create: POST /api/v3/users with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 114 } }]);
  const out = await action.execute(
    {
      "email": "n@x.co",
      "firstName": "New",
      "lastName": "User",
      "departmentRole": "department_user",
      "departmentId": 9,
      "skipWelcomeEmail": true,
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/users");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), {
    "email": "n@x.co",
    "first_name": "New",
    "last_name": "User",
    "department_role": "department_user",
    "department_id": 9,
    "skip_welcome_email": true,
  });
  assertEquals(out, { "id": 114 });
});
