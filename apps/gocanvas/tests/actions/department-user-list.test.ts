import { assertEquals } from "@std/assert";
import action from "../../actions/department-user-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("department-user-list: GET /api/v3/departments/1999/users with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 5 }] }]);
  const out = await action.execute({ "departmentId": 1999 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/departments/1999/users");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, [{ "id": 5 }]);
});
