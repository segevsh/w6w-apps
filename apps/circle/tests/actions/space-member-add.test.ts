import { assertEquals } from "@std/assert";
import { API, bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/space-member-add.ts";

Deno.test("space-member-add: POSTs /space_members with email and space in the BODY", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({ email: "a@b.c", spaceId: 3 }, ctx);
  assertEquals(calls[0].url, `${API}/space_members`);
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { email: "a@b.c", space_id: 3 });
});

Deno.test("space-member-add: is keyed by address, not by member id", () => {
  // A genuine inconsistency in Circle's API, worth pinning: an author holding a
  // member id from `member-list` cannot use it here.
  const keys = action.params!.map((p) => p.key);
  assertEquals(keys, ["email", "spaceId"]);
});

Deno.test("space-member-add: is idempotent — it converges on the membership", () => {
  assertEquals(action.idempotent, true);
});
