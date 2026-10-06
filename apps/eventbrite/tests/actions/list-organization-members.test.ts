import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-organization-members.ts";

Deno.test("list-organization-members: GETs members", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ organizationId: "org1", continuation: "c" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/organizations/org1/members/");
  assertEquals(url.searchParams.get("continuation"), "c");
  assertEquals(calls[0].body, null);
});
