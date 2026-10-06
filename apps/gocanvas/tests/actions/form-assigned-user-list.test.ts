import { assertEquals } from "@std/assert";
import action from "../../actions/form-assigned-user-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-assigned-user-list: GET /api/v3/forms/4639578/assigned_users with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 3310 }] }]);
  const out = await action.execute({ "formId": 4639578 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/forms/4639578/assigned_users");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, [{ "id": 3310 }]);
});
