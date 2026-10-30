import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-membership-create.ts";

test("organization-membership-create: POSTs userId + role", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "orgmem_1" } }]);
  await action.execute!({ organizationId: "org_1", userId: "user_1", role: "org:admin" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/organizations/org_1/memberships");
  assertEquals(JSON.parse(calls[0].body!), { user_id: "user_1", role: "org:admin" });
});

test("organization-membership-create: requires a role", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute!({ organizationId: "org_1", userId: "user_1" }, ctx),
    Error,
  );
  assert(/role/.test(String(err)));
  assertEquals(calls.length, 0);
});
