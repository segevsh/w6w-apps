import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import roleGet from "../../actions/role-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

test("role-get fetches by id and returns the full permission grid", async () => {
  const body = {
    role_id: 42390328,
    role_type: "master_account_role",
    role_name: "Administrator",
    lead_notifications: true,
    permissions: { integrations: "edit", leads: "edit" },
  };
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const out = await roleGet.execute({ roleId: 42390328 }, ctx);
  assertEquals(out, body);
  assertEquals(calls[0].url, `${API_ROOT}/roles/42390328`);
});
