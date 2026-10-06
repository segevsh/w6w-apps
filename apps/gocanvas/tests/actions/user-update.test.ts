import { assertEquals } from "@std/assert";
import action from "../../actions/user-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-update: PATCH /api/v3/users/114 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "message": "User updated successfully" } }]);
  const out = await action.execute(
    { "userId": 114, "phone": "555", "enabled": false } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v3/users/114");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), { "phone": "555", "enabled": false });
  assertEquals(out, { "message": "User updated successfully" });
});
