import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newRelease from "../../triggers/new-release.ts";
import newProject from "../../triggers/new-project.ts";
import newTeam from "../../triggers/new-team.ts";
import newMember from "../../triggers/new-member.ts";
import newOrganization from "../../triggers/new-organization.ts";
import newDeploy from "../../triggers/new-deploy.ts";

const display = { organization: "acme", organizationSlug: "acme" };
const base = "https://us.sentry.io/api/0";
const sent = (c: { method: string; url: string }) => ({ method: c.method, url: c.url });

// Snapshot triggers: [trigger, params, literal request URL, id field, item factory].
const snapshots = [
  {
    name: "new-project",
    trigger: newProject,
    params: { organizationSlug: "acme" },
    url: `${base}/organizations/acme/projects/?per_page=100`,
    mk: (id: string) => ({ id, slug: `p${id}` }),
  },
  {
    name: "new-team",
    trigger: newTeam,
    params: { organizationSlug: "acme" },
    url: `${base}/organizations/acme/teams/?detailed=0&per_page=100`,
    mk: (id: string) => ({ id, slug: `t${id}` }),
  },
  {
    name: "new-member",
    trigger: newMember,
    params: { organizationSlug: "acme" },
    url: `${base}/organizations/acme/members/?per_page=100`,
    mk: (id: string) => ({ id, email: `${id}@example.com` }),
  },
  {
    name: "new-organization",
    trigger: newOrganization,
    params: {},
    url: `${base}/organizations/?per_page=100`,
    mk: (id: string) => ({ id, slug: `o${id}` }),
  },
  {
    name: "new-deploy",
    trigger: newDeploy,
    params: { organizationSlug: "acme", version: "web@1.0" },
    url: `${base}/organizations/acme/releases/web%401.0/deploys/?per_page=100`,
    mk: (id: string) => ({ id, environment: "production" }),
  },
];

for (const c of snapshots) {
  describe(c.name, () => {
    const input = (state: unknown) => ({ params: c.params, state, subscriptionId: "s" });
    test("seeds, emits only the added record, retries identically, sends the literal request", async () => {
      const seed = mockCtx([{ body: [c.mk("1")] }], { display });
      const seeded = await c.trigger.poll!(input({}), seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(sent(seed.calls[0]), { method: "GET", url: c.url });
      const run = () => mockCtx([{ body: [c.mk("2"), c.mk("1")] }], { display });
      const first = run();
      const out = await c.trigger.poll!(input(seeded.nextState), first.ctx);
      const retry = await c.trigger.poll!(input(seeded.nextState), run().ctx);
      assertEquals(out.events, [c.mk("2")]);
      assertEquals(retry, out);
      assertEquals(sent(first.calls[0]), { method: "GET", url: c.url });
    });
  });
}

describe("new-release", () => {
  const params = { organizationSlug: "acme" };
  const rel = (version: string) => ({ version, dateCreated: "2026-11-10T09:00:00Z" });
  const url = `${base}/organizations/acme/releases/?per_page=100`;
  test("seeds, emits the newer release, retries identically, sends the literal request", async () => {
    const seed = mockCtx([{ body: [rel("1.0")] }], { display });
    const seeded = await newRelease.poll!({ params, state: {}, subscriptionId: "s" }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(sent(seed.calls[0]), { method: "GET", url });
    const run = () => mockCtx([{ body: [rel("1.1"), rel("1.0")] }], { display });
    const first = run();
    const out = await newRelease.poll!(
      { params, state: seeded.nextState, subscriptionId: "s" },
      first.ctx,
    );
    const retry = await newRelease.poll!(
      { params, state: seeded.nextState, subscriptionId: "s" },
      run().ctx,
    );
    assertEquals(out.events, [rel("1.1")]);
    assertEquals(retry, out);
    assertEquals(sent(first.calls[0]), { method: "GET", url });
  });
});

// Multi-page fixtures: a Link `rel="next"` header makes the action follow the cursor, so a
// snapshot or newest-first feed that stopped after one page (or capped its limit) would lose rows.
const next = (path: string, cursor: string) => ({
  "content-type": "application/json",
  link: `<${base}${path}?cursor=${cursor}>; rel="previous"; results="false"; cursor="p", ` +
    `<${base}${path}?cursor=${cursor}>; rel="next"; results="true"; cursor="${cursor}"`,
});

describe("multi-page lists", () => {
  test("new-release follows the Link cursor to the second page (limit 100, not 5)", async () => {
    const params = { organizationSlug: "acme" };
    const rel = (n: number) => ({ version: `r${n}`, dateCreated: "2026-11-10T09:00:00Z" });
    const seeded = await newRelease.poll!(
      { params, state: {}, subscriptionId: "s" },
      mockCtx([{ body: [rel(0)] }], { display }).ctx,
    );
    const run = mockCtx([
      { body: [rel(1), rel(2), rel(3)], headers: next("/organizations/acme/releases/", "c2") },
      { body: [rel(4), rel(5), rel(6)] },
    ], { display });
    const out = await newRelease.poll!(
      { params, state: seeded.nextState, subscriptionId: "s" },
      run.ctx,
    );
    assertEquals(run.calls.length, 2);
    assertEquals(
      run.calls[1].url,
      `${base}/organizations/acme/releases/?per_page=100&cursor=c2`,
    );
    assertEquals(out.events.length, 6);
  });

  test("new-deploy drains every page (returnAll), not just the first 50 rows", async () => {
    const params = { organizationSlug: "acme", version: "web@1.0" };
    const path = "/organizations/acme/releases/web%401.0/deploys/";
    const dep = (n: number) => ({ id: `d${n}`, environment: "production" });
    const seeded = await newDeploy.poll!(
      { params, state: {}, subscriptionId: "s" },
      mockCtx([{ body: [dep(0)] }], { display }).ctx,
    );
    const page = (from: number) => Array.from({ length: 30 }, (_, i) => dep(from + i));
    const run = mockCtx([
      { body: page(1), headers: next(path, "c2") },
      { body: page(31) },
    ], { display });
    const out = await newDeploy.poll!(
      { params, state: seeded.nextState, subscriptionId: "s" },
      run.ctx,
    );
    assertEquals(run.calls.length, 2);
    assertEquals(run.calls[1].url, `${base}${path}?per_page=100&cursor=c2`);
    assertEquals(out.events.length, 60);
  });
});
