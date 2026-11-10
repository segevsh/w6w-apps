import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import invitationList from "../../actions/invitation-list.ts";
import membershipList from "../../actions/organization-membership-list.ts";

test("invitation-list sends order_by only when orderBy is set", async () => {
  const withOrder = mockCtx([{ body: [] }]);
  await invitationList.execute!({ orderBy: "-created_at" }, withOrder.ctx);
  assertEquals(
    withOrder.calls[0].url,
    "https://api.clerk.com/v1/invitations?order_by=-created_at&limit=10&offset=0",
  );
  const without = mockCtx([{ body: [] }]);
  await invitationList.execute!({}, without.ctx);
  assertEquals(without.calls[0].url, "https://api.clerk.com/v1/invitations?limit=10&offset=0");
});

test("organization-membership-list sends order_by only when orderBy is set", async () => {
  const withOrder = mockCtx([{ body: { data: [], total_count: 0 } }]);
  await membershipList.execute!({ organizationId: "org_1", orderBy: "-created_at" }, withOrder.ctx);
  assertEquals(
    withOrder.calls[0].url,
    "https://api.clerk.com/v1/organizations/org_1/memberships?order_by=-created_at&limit=10&offset=0",
  );
  const without = mockCtx([{ body: { data: [], total_count: 0 } }]);
  await membershipList.execute!({ organizationId: "org_1" }, without.ctx);
  assertEquals(
    without.calls[0].url,
    "https://api.clerk.com/v1/organizations/org_1/memberships?limit=10&offset=0",
  );
});
