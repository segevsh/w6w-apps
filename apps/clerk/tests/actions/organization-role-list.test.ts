import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-role-list.ts";

Deno.test("organization-role-list: unwraps the `{ data, total_count }` envelope", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "role_1", key: "org:admin" }], total_count: 2 },
  }]);
  const out = await action.execute!({}, ctx) as { data: unknown[]; totalCount: number };
  assertEquals(new URL(calls[0].url).pathname, "/v1/organization_roles");
  assertEquals(out.data.length, 1);
  assertEquals(out.totalCount, 2);
});
