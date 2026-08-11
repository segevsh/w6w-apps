import { assert, assertEquals, assertRejects } from "@std/assert";
import deleteGroup from "../../actions/delete-group.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-group: POSTs to the id path and reports success", async () => {
  const { ctx, calls, logs } = mockCtx([{ body: { success: true } }]);
  assertEquals(await deleteGroup.execute({ groupId: 321 }, ctx), { success: true });

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3.0/delete_group/321");
  assert(logs.some((l) => l.level === "warn"), "a destructive delete logged no warning");
});

/**
 * "200 OK does not indicate a successful response. You must check the `success`
 * value." A caller reading `res.ok` would report every refusal as a success.
 */
Deno.test("delete-group: a 200 with success:false throws", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { success: false } }]);
  await assertRejects(
    async () => await deleteGroup.execute({ groupId: 321 }, ctx),
    Error,
    "success=false",
  );
});

Deno.test("delete-group: is idempotent — deleting twice converges", () => {
  assertEquals(deleteGroup.idempotent, true);
});
