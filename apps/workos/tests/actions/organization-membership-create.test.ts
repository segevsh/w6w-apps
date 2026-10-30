import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-membership-create.ts";

test("organization-membership-create: sends the role when given one", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "om_1" } }]);
  await action.execute!({ userId: "user_1", organizationId: "org_1", roleSlug: "admin" }, ctx);
  assertEquals(calls[0].url, "https://api.workos.com/user_management/organization_memberships");
  assertEquals(JSON.parse(calls[0].body!), {
    user_id: "user_1",
    organization_id: "org_1",
    role_slug: "admin",
  });
});

/**
 * Omitting the role does not grant nothing — WorkOS applies the environment's
 * default, so a workflow that forgets the field still makes an assignment.
 */
test("organization-membership-create: says so when it falls back to the default role", async () => {
  const { ctx, logs } = mockCtx([{ status: 201, body: { id: "om_1" } }]);
  await action.execute!({ userId: "user_1", organizationId: "org_1" }, ctx);
  assert(logs.some((l) => /default role/.test(l.message)), JSON.stringify(logs));
});

test("organization-membership-create: needs both sides of the join", async () => {
  const noUser = mockCtx();
  await assertRejects(
    async () => await action.execute!({ organizationId: "org_1" }, noUser.ctx),
    Error,
    "userId",
  );
  assertEquals(noUser.calls.length, 0);

  const noOrg = mockCtx();
  await assertRejects(
    async () => await action.execute!({ userId: "user_1" }, noOrg.ctx),
    Error,
    "organizationId",
  );
  assertEquals(noOrg.calls.length, 0);
});

/** This is a grant with no acceptance step, and says so. */
test("organization-membership-create: names itself an immediate grant", () => {
  assert(/no\s+invitation step/i.test(action.description!), action.description);
});
