import { assertEquals } from "@std/assert";
import action from "../../actions/form-user-unassign.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-user-unassign: DELETE /api/v3/forms/4639578/assigned_users/3310 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "message": "ok" } }]);
  const out = await action.execute({ "formId": 4639578, "userId": 3310 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/forms/4639578/assigned_users/3310");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "message": "ok" });

  const empty = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await action.execute({ formId: 1, userId: 2 }, empty.ctx), { deleted: true });
});
