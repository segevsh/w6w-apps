import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newProject from "../../triggers/new-project.ts";
import newOrUpdatedProject from "../../triggers/new-or-updated-project.ts";
import newDomain from "../../triggers/new-domain.ts";
import newProjectDomain from "../../triggers/new-project-domain.ts";
import newEnvVar from "../../triggers/new-env-var.ts";
import newOrUpdatedEnvVar from "../../triggers/new-or-updated-env-var.ts";
import newAlias from "../../triggers/new-alias.ts";
import { clock } from "../../lib/walk.ts";

const page = (key: string, items: unknown[], next: number | null = null) => ({
  body: { [key]: items, pagination: { count: items.length, next, prev: null } },
});
const q = (url: string) => Object.fromEntries(new URL(url).searchParams);
const idsOf = (events: unknown[], k: string) => events.map((e) => (e as Record<string, string>)[k]);

// Table-driven: the bounded-collection (pollSnapshot) triggers share one case set.
const specs = [
  {
    name: "new-project",
    trigger: newProject,
    params: {},
    path: "/v10/projects",
    query: { limit: "100" },
    response: (items: unknown[]) => page("projects", items),
    old: [{ id: "prj_a", updatedAt: 1 }],
    fresh: { id: "prj_b", updatedAt: 2 },
    idKey: "id",
  },
  {
    name: "new-domain",
    trigger: newDomain,
    params: {},
    path: "/v5/domains",
    query: { limit: "100" },
    response: (items: unknown[]) => page("domains", items),
    old: [{ id: "dom_a", name: "a.example.com" }],
    fresh: { id: "dom_b", name: "b.example.com" },
    idKey: "id",
  },
  {
    name: "new-project-domain",
    trigger: newProjectDomain,
    params: { projectId: "my-app" },
    path: "/v9/projects/my-app/domains",
    query: { limit: "100" },
    response: (items: unknown[]) => page("domains", items),
    old: [{ name: "a.example.com" }],
    fresh: { name: "b.example.com" },
    idKey: "name",
  },
  {
    name: "new-env-var",
    trigger: newEnvVar,
    params: { projectId: "my-app" },
    path: "/v10/projects/my-app/env",
    query: {},
    response: (items: unknown[]) => ({ body: { envs: items } }),
    old: [{ id: "env_a", key: "A" }],
    fresh: { id: "env_b", key: "B" },
    idKey: "id",
  },
  {
    name: "new-or-updated-project",
    trigger: newOrUpdatedProject,
    params: {},
    path: "/v10/projects",
    query: { limit: "100" },
    response: (items: unknown[]) => page("projects", items),
    old: [{ id: "prj_a", updatedAt: 1 }],
    fresh: { id: "prj_b", updatedAt: 2 },
    idKey: "id",
  },
  {
    name: "new-or-updated-env-var",
    trigger: newOrUpdatedEnvVar,
    params: { projectId: "my-app" },
    path: "/v10/projects/my-app/env",
    query: {},
    response: (items: unknown[]) => ({ body: { envs: items } }),
    old: [{ id: "env_a", key: "A", updatedAt: 1 }],
    fresh: { id: "env_b", key: "B", updatedAt: 2 },
    idKey: "id",
  },
];

for (const { name, trigger, params, path, query, response, old, fresh, idKey } of specs) {
  const input = { params, subscriptionId: "sub-1" };

  test(`${name}: seeds without events, then emits only the new record`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([response(old)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    const next = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([response([fresh, ...old])]).ctx,
    );
    assertEquals(idsOf(next.events, idKey), [(fresh as Record<string, string>)[idKey]]);
  });

  test(`${name}: the same state and responses give the same result`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([response(old)]).ctx);
    const run = () =>
      trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([response([fresh])]).ctx);
    assertEquals(await run(), await run());
  });

  test(`${name}: asks the list action's own endpoint`, async () => {
    const c = mockCtx([response(old)]);
    await trigger.poll!({ ...input, state: {} }, c.ctx);
    assertEquals(c.calls[0].method, "GET");
    assertEquals(new URL(c.calls[0].url).pathname, path);
    assertEquals(q(c.calls[0].url), query);
  });
}

test("new-project: reads every page of the list, so a project on page 2 is seen", async () => {
  const input = { params: {}, subscriptionId: "sub-1" };
  const c = mockCtx([
    page("projects", [{ id: "p1" }], 1794700000000),
    page("projects", [{ id: "p2" }]),
  ]);
  const s = await newProject.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(s.events, []);
  assertEquals(c.calls.length, 2);
  assertEquals(q(c.calls[1].url), { limit: "100", until: "1794700000000" });
  const r = await newProject.poll!(
    { ...input, state: s.nextState },
    mockCtx([
      page("projects", [{ id: "p1" }], 1794700000000),
      page("projects", [{ id: "p2" }, { id: "p3" }]),
    ])
      .ctx,
  );
  assertEquals(idsOf(r.events, "id"), ["p3"]);
});

test("new-or-updated-project: an edited project (new updatedAt) is a new event", async () => {
  const input = { params: {}, subscriptionId: "sub-1" };
  const s = await newOrUpdatedProject.poll!(
    { ...input, state: {} },
    mockCtx([page("projects", [{ id: "p1", updatedAt: 1 }])]).ctx,
  );
  const r = await newOrUpdatedProject.poll!(
    { ...input, state: s.nextState },
    mockCtx([page("projects", [{ id: "p1", updatedAt: 9 }])]).ctx,
  );
  assertEquals(r.events, [{ id: "p1", updatedAt: 9 }]);
  const none = await newProject.poll!(
    {
      ...input,
      state: (await newProject.poll!(
        { ...input, state: {} },
        mockCtx([page("projects", [{ id: "p1", updatedAt: 1 }])]).ctx,
      ))
        .nextState,
    },
    mockCtx([page("projects", [{ id: "p1", updatedAt: 9 }])]).ctx,
  );
  assertEquals(none.events, []);
});

test("new-or-updated-env-var: an edited variable is a new event", async () => {
  const input = { params: { projectId: "my-app" }, subscriptionId: "sub-1" };
  const env = (updatedAt: number) => ({ body: { envs: [{ id: "env_a", updatedAt }] } });
  const s = await newOrUpdatedEnvVar.poll!({ ...input, state: {} }, mockCtx([env(1)]).ctx);
  const r = await newOrUpdatedEnvVar.poll!({ ...input, state: s.nextState }, mockCtx([env(5)]).ctx);
  assertEquals(r.events, [{ id: "env_a", updatedAt: 5 }]);
});

test("new-env-var: never asks Vercel to decrypt values", async () => {
  const c = mockCtx([{ body: { envs: [] } }]);
  await newEnvVar.poll!({ params: { projectId: "my-app" }, subscriptionId: "s", state: {} }, c.ctx);
  assertEquals(new URL(c.calls[0].url).searchParams.has("decrypt"), false);
});

// new-alias: since-filter shape (b), brief §9.8 / §9.9.
const NOW = 1_794_700_000_000;
const ainput = { params: {}, subscriptionId: "sub-1" };
const alias = (uid: string, createdAt: number) => ({ uid, alias: `${uid}.vercel.app`, createdAt });
const seedAlias = () => {
  clock.now = () => NOW;
  return newAlias.poll!({ ...ainput, state: {} }, mockCtx([]).ctx);
};

test("new-alias: the first check seeds a floor and reads nothing", async () => {
  const c = mockCtx([]);
  clock.now = () => NOW;
  const s = await newAlias.poll!({ ...ainput, state: {} }, c.ctx);
  assertEquals(s.events, []);
  assertEquals(c.calls.length, 0);
  assertEquals((s.nextState as { floor: number }).floor, NOW);
});

test("new-alias: asks /v4/aliases with since = last check - 2 min, emits new aliases, idempotent", async () => {
  const s = await seedAlias();
  const c = mockCtx([page("aliases", [alias("b", NOW + 60_000), alias("a", NOW + 30_000)])]);
  const r = await newAlias.poll!({ ...ainput, state: s.nextState }, c.ctx);
  assertEquals(idsOf(r.events, "uid"), ["b", "a"]);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(new URL(c.calls[0].url).pathname, "/v4/aliases");
  assertEquals(q(c.calls[0].url), { since: String(NOW - 120_000), limit: "100" });
  const again = await newAlias.poll!(
    { ...ainput, state: s.nextState },
    mockCtx([page("aliases", [alias("b", NOW + 60_000), alias("a", NOW + 30_000)])]).ctx,
  );
  assertEquals(again, r);
  const r2 = await newAlias.poll!(
    { ...ainput, state: r.nextState },
    mockCtx([page("aliases", [alias("c", NOW + 90_000), alias("b", NOW + 60_000)])]).ctx,
  );
  assertEquals(idsOf(r2.events, "uid"), ["c"]);
});

test("new-alias: a window of several vendor pages is drained by one check (the action pages with until)", async () => {
  const s = await seedAlias();
  const p1 = Array.from({ length: 100 }, (_, i) => alias(`x${i}`, NOW + 500_000 - i));
  const p2 = Array.from({ length: 100 }, (_, i) => alias(`y${i}`, NOW + 400_000 - i));
  const c = mockCtx([
    page("aliases", p1, NOW + 400_100),
    page("aliases", p2, NOW + 399_900),
    page("aliases", []),
  ]);
  const r = await newAlias.poll!({ ...ainput, state: s.nextState }, c.ctx);
  assertEquals(r.events.length, 200);
  assertEquals(q(c.calls[1].url), {
    since: String(NOW - 120_000),
    limit: "100",
    until: String(NOW + 400_100),
  });
});

test("new-alias: aliases from before the seed never flood a later check", async () => {
  const s = await seedAlias();
  const old = Array.from({ length: 600 }, (_, i) => alias(`o${i}`, NOW - 3_600_000 - i));
  const r1 = await newAlias.poll!(
    { ...ainput, state: s.nextState },
    mockCtx([
      page("aliases", old.slice(0, 100), NOW - 3_700_000),
      page("aliases", old.slice(100, 200)),
    ]).ctx,
  );
  assertEquals(r1.events, []);
  const r2 = await newAlias.poll!(
    { ...ainput, state: r1.nextState },
    mockCtx([page("aliases", [alias("fresh", NOW + 10_000), ...old.slice(0, 99)])]).ctx,
  );
  assertEquals(idsOf(r2.events, "uid"), ["fresh"]);
});
