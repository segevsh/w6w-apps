import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-get-many.ts";

Deno.test("organization-get-many: GETs /organizations with query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: [] } }]);
  await action.execute!({ userId: 2, limit: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/organizations");
  assertEquals(url.searchParams.get("user_id"), "2");
  assertEquals(url.searchParams.get("limit"), "10");
});
