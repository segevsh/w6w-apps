import { assertEquals } from "@std/assert";
import jobItemRoleGet from "../../actions/job-item-role-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-role-get: reads GET /v2/job_item_roles/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5, roleId: 12, active: true } }]);
  const result = await jobItemRoleGet.execute({ jobItemRoleId: 5 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/job_item_roles/5");
  assertEquals(result.active, true);
});
