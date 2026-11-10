import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newOrganization from "../../triggers/new-organization.ts";
import newOrganizationRole from "../../triggers/new-organization-role.ts";
import newOrganizationMembership from "../../triggers/new-organization-membership.ts";
import newOrganizationInvitation from "../../triggers/new-organization-invitation.ts";
import newInvitation from "../../triggers/new-invitation.ts";
import newSession from "../../triggers/new-session.ts";

const cases = [
  {
    trigger: newOrganization,
    params: {},
    shape: "envelope",
    url: "https://api.clerk.com/v1/organizations?limit=100&offset=0",
  },
  {
    trigger: newOrganizationRole,
    params: {},
    shape: "envelope",
    url: "https://api.clerk.com/v1/organization_roles?limit=100&offset=0",
  },
  {
    trigger: newOrganizationMembership,
    params: { "organizationId": "org_1" },
    shape: "envelope",
    url:
      "https://api.clerk.com/v1/organizations/org_1/memberships?order_by=-created_at&limit=100&offset=0",
  },
  {
    trigger: newOrganizationInvitation,
    params: { "organizationId": "org_1" },
    shape: "envelope",
    url: "https://api.clerk.com/v1/organizations/org_1/invitations?limit=100&offset=0",
  },
  {
    trigger: newInvitation,
    params: {},
    shape: "array",
    url: "https://api.clerk.com/v1/invitations?order_by=-created_at&limit=100&offset=0",
  },
  {
    trigger: newSession,
    params: { "userId": "user_1" },
    shape: "array",
    url: "https://api.clerk.com/v1/sessions?user_id=user_1&limit=100&offset=0",
  },
];
const body = (shape: string, items: unknown[]) =>
  shape === "envelope" ? { data: items, total_count: items.length } : items;
const item = (id: string) => ({ id, created_at: 1794128400000 });

for (const c of cases) {
  test(`${c.trigger.key} seeds, emits only the new record, retries identically, sends the literal request`, async () => {
    const input = { params: c.params, subscriptionId: "s" };
    const seeded = await c.trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: body(c.shape, [item("a")]) }]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = body(c.shape, [item("b"), item("a")]);
    const run = mockCtx([{ body: page }]);
    const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, run.ctx);
    assertEquals(first.events, [item("b")]);
    assertEquals(run.calls.map((x) => [x.method, x.url]), [["GET", c.url]]);
    const retry = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page }]).ctx,
    );
    assertEquals(retry, first);
  });
}

test("the invitation accept link and session tokens never reach the run event", async () => {
  const seeded = await newInvitation.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: [item("z")] }]).ctx,
  );
  const withLink = { id: "a", status: "pending", url: "https://accounts.example.com/ticket-1" };
  const out = await newInvitation.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([{ body: [withLink, item("z")] }]).ctx,
  );
  assertEquals(out.events, [{ id: "a", status: "pending" }]);
  const sessSeed = await newSession.poll!(
    { params: { userId: "user_1" }, state: {} },
    mockCtx([{ body: [item("z")] }]).ctx,
  );
  const sess = await newSession.poll!(
    { params: { userId: "user_1" }, state: sessSeed.nextState },
    mockCtx([{ body: [{ id: "s1", last_active_token: { jwt: "token-value" } }, item("z")] }]).ctx,
  );
  assertEquals(sess.events, [{ id: "s1" }]);
});
