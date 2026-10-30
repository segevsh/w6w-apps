import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import organizationDelete from "../../actions/organization-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

test("organization-delete: DELETEs the organization", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await organizationDelete.execute({ organizationKey: "o1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/organizations/o1");
  assertEquals(out, { success: true });
});
