import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-list.ts";

Deno.test("organization-list: unwraps the `{ data, total_count }` envelope", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "org_1" }], total_count: 1 },
  }]);
  const out = await action.execute!({}, ctx) as { data: unknown[]; totalCount: number };
  assertEquals(new URL(calls[0].url).pathname, "/v1/organizations");
  assertEquals(out.data.length, 1);
  assertEquals(out.totalCount, 1);
});
