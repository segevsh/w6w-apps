import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-member-list.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

Deno.test("organization-member-list: asks for members with their org roles", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { members: [], total: 0 } }], conn);
  await action.execute!({ organizationId: "org_1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/organizations/org_1/members");
  assertEquals(url.searchParams.get("fields"), "roles");
});

Deno.test("organization-member-list: a missing organization is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "organizationId");
  assertEquals(calls.length, 0);
});
