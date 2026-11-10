import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newClient from "../../triggers/new-client.ts";
import newConnection from "../../triggers/new-connection.ts";
import newOrganization from "../../triggers/new-organization.ts";
import newOrganizationMember from "../../triggers/new-organization-member.ts";
import newRole from "../../triggers/new-role.ts";
import newUser from "../../triggers/new-user.ts";
import newUserRole from "../../triggers/new-user-role.ts";
import type { TriggerDefinition } from "@w6w/types";

const API = "https://acme.us.auth0.com/api/v2";
const ctxFor = (bodies: unknown[]) =>
  mockCtx(bodies.map((body) => ({ status: 200, body })), {
    display: { domain: "acme.us.auth0.com" },
  });

interface Case {
  name: string;
  trigger: TriggerDefinition;
  params: Record<string, unknown>;
  idKey: string;
  /** Literal URL of the first (only) request one check makes. */
  url: string;
}

const PAGE = "page=0&per_page=100&include_totals=true";
const cases: Case[] = [
  {
    name: "new-user",
    trigger: newUser,
    params: {},
    idKey: "user_id",
    url: `${API}/users?sort=created_at%3A-1&page=0&per_page=100&include_totals=true`,
  },
  {
    name: "new-client",
    trigger: newClient,
    params: {},
    idKey: "client_id",
    url:
      `${API}/clients?fields=client_id%2Cname%2Cdescription%2Capp_type%2Ccallbacks%2Cgrant_types%2Cis_first_party%2Clogo_uri&include_fields=true&${PAGE}`,
  },
  {
    name: "new-connection",
    trigger: newConnection,
    params: {},
    idKey: "id",
    url: `${API}/connections?${PAGE}`,
  },
  {
    name: "new-organization",
    trigger: newOrganization,
    params: {},
    idKey: "id",
    url: `${API}/organizations?${PAGE}`,
  },
  { name: "new-role", trigger: newRole, params: {}, idKey: "id", url: `${API}/roles?${PAGE}` },
  {
    name: "new-organization-member",
    trigger: newOrganizationMember,
    params: { organizationId: "org_1" },
    idKey: "user_id",
    url: `${API}/organizations/org_1/members?${PAGE}`,
  },
  {
    name: "new-user-role",
    trigger: newUserRole,
    params: { userId: "auth0|u1" },
    idKey: "id",
    url: `${API}/users/auth0%7Cu1/roles?${PAGE}`,
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const rec = (id: string) => ({ [c.idKey]: id, name: `Item ${id}` });
    const poll = async (state: unknown, ids: string[]) => {
      const m = ctxFor([ids.map(rec)]);
      const r = await c.trigger.poll!({ params: c.params, state, subscriptionId: "s" }, m.ctx);
      return { r, calls: m.calls };
    };

    test("seeds without events, then emits only the new record, idempotently", async () => {
      const seeded = await poll({}, ["b", "a"]);
      assertEquals(seeded.r.events, []);
      assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
      const first = await poll(seeded.r.nextState, ["c", "b", "a"]);
      const retry = await poll(seeded.r.nextState, ["c", "b", "a"]);
      assertEquals(first.r.events, [rec("c")]);
      assertEquals(retry.r, first.r);
    });

    test("sends the literal request of the wrapped list action", async () => {
      const { calls } = await poll({}, ["a"]);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "GET");
      assertEquals(calls[0].url, c.url);
    });
  });
}

test("new-role: a removed role is not an event, and the list is read to its last page", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: `r${i}` }));
  const m = ctxFor([full, [{ id: "r100" }]]);
  const seeded = await newRole.poll!({ params: {}, state: {}, subscriptionId: "s" }, m.ctx);
  assertEquals(m.calls.map((x) => x.url), [
    `${API}/roles?${PAGE}`,
    `${API}/roles?page=1&per_page=100&include_totals=true`,
  ]);
  const next = await newRole.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    ctxFor([full.slice(1), []]).ctx,
  );
  assertEquals(next.events, []);
});

test("new-role: a list longer than 5000 rows throws instead of passing silently", async () => {
  const pages = Array.from(
    { length: 51 },
    (_, p) => Array.from({ length: p < 50 ? 100 : 1 }, (_, i) => ({ id: `r${p}-${i}` })),
  );
  await assertRejects(() =>
    newRole.poll!({ params: {}, state: {}, subscriptionId: "s" }, ctxFor(pages).ctx)
  );
});
