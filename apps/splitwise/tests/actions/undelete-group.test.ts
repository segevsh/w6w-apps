import { assertEquals, assertRejects } from "@std/assert";
import undeleteGroup from "../../actions/undelete-group.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("undelete-group: POSTs to the id path", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, errors: [] } }]);
  assertEquals(await undeleteGroup.execute({ groupId: 321 }, ctx), { success: true });
  assertEquals(pathOf(calls[0].url), "/api/v3.0/undelete_group/321");
  assertEquals(calls[0].method, "POST");
});

/**
 * This is the endpoint whose `errors` is a bare ARRAY. `[]` is truthy, so a
 * client checking `if (body.errors)` reports every successful undelete as a
 * failure — which is why the emptiness test runs on the flattened list.
 */
Deno.test("undelete-group: an empty errors ARRAY is a success, not a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: true, errors: [] } }]);
  assertEquals(await undeleteGroup.execute({ groupId: 1 }, ctx), { success: true });
});

Deno.test("undelete-group: a populated errors ARRAY is a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { success: false, errors: ["Not deleted"] } }]);
  await assertRejects(
    async () => await undeleteGroup.execute({ groupId: 1 }, ctx),
    Error,
    "Not deleted",
  );
});

Deno.test("undelete-group: is idempotent", () => {
  assertEquals(undeleteGroup.idempotent, true);
});
