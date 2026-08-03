import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/tagged-member-remove.ts";

Deno.test("tagged-member-remove: DELETEs with QUERY parameters, mirroring the POST's body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({ memberTagId: 5, userEmail: "a@b.c" }, ctx);
  assertEquals(pathOf(calls[0]), "/api/admin/v2/tagged_members");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(queryOf(calls[0]), { member_tag_id: ["5"], user_email: ["a@b.c"] });
});

Deno.test("tagged-member-remove: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
