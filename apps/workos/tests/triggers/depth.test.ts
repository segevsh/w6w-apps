import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newOrganization from "../../triggers/new-organization.ts";
import newConnection from "../../triggers/new-connection.ts";
import newDirectory from "../../triggers/new-directory.ts";
import newDirectoryUser from "../../triggers/new-directory-user.ts";
import newDirectoryGroup from "../../triggers/new-directory-group.ts";
import newUser from "../../triggers/new-user.ts";
import newOrganizationMembership from "../../triggers/new-organization-membership.ts";

const base = { subscriptionId: "sub-1" };
const q = (url: string) => Object.fromEntries(new URL(url).searchParams);
const p = (url: string) => new URL(url).pathname;
const page = (items: unknown[]) => ({ body: { data: items, list_metadata: { after: null } } });

interface Case {
  name: string;
  // deno-lint-ignore no-explicit-any
  trigger: any;
  params: Record<string, unknown>;
  path: string;
  query: Record<string, string>;
}

const cases: Case[] = [
  {
    name: "new-organization",
    trigger: newOrganization,
    params: {},
    path: "/organizations",
    query: { order: "desc", limit: "50" },
  },
  {
    name: "new-connection",
    trigger: newConnection,
    params: { organizationId: "org_1" },
    path: "/connections",
    query: { organization_id: "org_1", order: "desc", limit: "50" },
  },
  {
    name: "new-directory",
    trigger: newDirectory,
    params: { organizationId: "org_1" },
    path: "/directories",
    query: { organization_id: "org_1", order: "desc", limit: "50" },
  },
  {
    name: "new-directory-user",
    trigger: newDirectoryUser,
    params: { directoryId: "directory_1" },
    path: "/directory_users",
    query: { directory: "directory_1", order: "desc", limit: "50" },
  },
  {
    name: "new-directory-group",
    trigger: newDirectoryGroup,
    params: { directoryId: "directory_1" },
    path: "/directory_groups",
    query: { directory: "directory_1", order: "desc", limit: "50" },
  },
  {
    name: "new-user",
    trigger: newUser,
    params: { organizationId: "org_1" },
    path: "/user_management/users",
    query: { organization_id: "org_1", order: "desc", limit: "50" },
  },
  {
    name: "new-organization-membership",
    trigger: newOrganizationMembership,
    params: { organizationId: "org_1" },
    path: "/user_management/organization_memberships",
    query: { organization_id: "org_1", order: "desc", limit: "50" },
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const input = (state: unknown) => ({ ...base, params: c.params, state });

    test("seeds without emitting and sends the literal newest-first request", async () => {
      const m = mockCtx([page([{ id: "a" }])]);
      const seeded = await c.trigger.poll!(input({}), m.ctx);
      assertEquals(seeded.events, []);
      assertEquals(seeded.nextState.seeded, true);
      assertEquals(m.calls[0].method, "GET");
      assertEquals(p(m.calls[0].url), c.path);
      assertEquals(q(m.calls[0].url), c.query);
    });

    test("emits the new record once; a retry is identical", async () => {
      const seeded = await c.trigger.poll!(input({}), mockCtx([page([{ id: "a" }])]).ctx);
      const responses = () => [page([{ id: "b" }, { id: "a" }])];
      const one = await c.trigger.poll!(input(seeded.nextState), mockCtx(responses()).ctx);
      const two = await c.trigger.poll!(input(seeded.nextState), mockCtx(responses()).ctx);
      assertEquals(one.events, [{ id: "b" }]);
      assertEquals(one, two);
    });
  });
}
