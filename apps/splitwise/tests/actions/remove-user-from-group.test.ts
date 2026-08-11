import { assertEquals, assertRejects } from "@std/assert";
import removeUserFromGroup from "../../actions/remove-user-from-group.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("remove-user-from-group: both ids go in the body, not the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  assertEquals(await removeUserFromGroup.execute({ groupId: 4012, userId: 940142 }, ctx), {
    success: true,
  });

  assertEquals(pathOf(calls[0].url), "/api/v3.0/remove_user_from_group");
  assertEquals(bodyOf(calls[0]), { group_id: 4012, user_id: 940142 });
});

/**
 * "Does not succeed if the user has a non-zero balance" — and that arrives as a
 * 200, not an HTTP error. A workflow must see the reason, not a silent no-op.
 */
Deno.test("remove-user-from-group: a non-zero balance refusal surfaces as an error", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { success: false, errors: { base: ["That user has a non-zero balance in this group"] } },
  }]);
  await assertRejects(
    async () => await removeUserFromGroup.execute({ groupId: 1, userId: 2 }, ctx),
    Error,
    "non-zero balance",
  );
});

Deno.test("remove-user-from-group: a bad id fails before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await removeUserFromGroup.execute({ groupId: 0, userId: 2 }, ctx),
    Error,
    "groupId must be a positive integer id",
  );
  assertEquals(calls.length, 0);
});

Deno.test("remove-user-from-group: is idempotent", () => {
  assertEquals(removeUserFromGroup.idempotent, true);
});
