import { assert, assertEquals, assertRejects } from "@std/assert";
import deleteFriend from "../../actions/delete-friend.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-friend: POSTs to the friend's user id", async () => {
  const { ctx, calls, logs } = mockCtx([{ body: { success: true } }]);
  assertEquals(await deleteFriend.execute({ userId: 15 }, ctx), { success: true });

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3.0/delete_friend/15");
  // There is no undelete-friend endpoint, so this one warns.
  assert(logs.some((l) => l.level === "warn"), "an irreversible delete logged no warning");
});

Deno.test("delete-friend: a 200 with success:false throws", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { success: false, errors: {} } }]);
  await assertRejects(
    async () => await deleteFriend.execute({ userId: 15 }, ctx),
    Error,
    "success=false",
  );
});

Deno.test("delete-friend: is idempotent", () => {
  assertEquals(deleteFriend.idempotent, true);
});
