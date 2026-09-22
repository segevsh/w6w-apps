import { assertEquals } from "@std/assert";
import jobItemRolesList from "../../actions/job-item-roles-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-roles-list: reads the nested route", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 5, roleId: 12 }] }]);
  const result = await jobItemRolesList.execute({ jobItemId: 88 }, ctx) as {
    jobItemRoles: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v2/job_items/88/job_item_roles");
  assertEquals(result.jobItemRoles.length, 1);
});
