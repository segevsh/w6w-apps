import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-delete.ts";

Deno.test("organization-delete: DELETEs only when confirmed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "org_1", deleted: true } }]);
  await action.execute!({ organizationId: "org_1", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("organization-delete: without confirm=true, nothing is sent", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute!({ organizationId: "org_1" }, ctx),
    Error,
  );
  assert(/confirm/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});
