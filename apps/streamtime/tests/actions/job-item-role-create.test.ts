import { assertEquals } from "@std/assert";
import jobItemRoleCreate from "../../actions/job-item-role-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-role-create: POSTs the role assignment", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5, roleId: 12 } }]);
  await jobItemRoleCreate.execute({ jobItemId: 88, roleId: 12, totalPlannedMinutes: 180 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/job_items/88/job_item_roles");
  assertEquals(bodyOf(calls[0]), { roleId: 12, totalPlannedMinutes: 180 });
});

Deno.test("job-item-role-create: roleId is required and integer-validated", () => {
  const param = (jobItemRoleCreate.params ?? []).find((p) => p.key === "roleId");
  assertEquals(param?.required, true);
  assertEquals(param?.validation, { integer: true, min: 1 });
});
