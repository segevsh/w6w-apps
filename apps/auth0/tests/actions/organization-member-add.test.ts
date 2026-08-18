import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-member-add.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

Deno.test("organization-member-add: posts the member list", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], conn);
  await action.execute!({ organizationId: "org_1", userIds: "auth0|1,auth0|2" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/organizations/org_1/members");
  assertEquals(JSON.parse(calls[0].body!), { members: ["auth0|1", "auth0|2"] });
});

Deno.test("organization-member-add: an empty user list is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ organizationId: "org_1" }, ctx),
    Error,
    "userIds",
  );
});

/** Membership alone grants nothing — the roles are a second call. */
Deno.test("organization-member-add: says membership is not permission", () => {
  assert(/grants nothing|separate step/i.test(action.description!), action.description);
});
