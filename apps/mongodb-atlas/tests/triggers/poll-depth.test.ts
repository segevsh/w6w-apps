import { test } from "node:test";
import { rejects } from "node:assert/strict";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newAlert from "../../triggers/new-alert.ts";
import newCluster from "../../triggers/new-cluster.ts";
import newFlexCluster from "../../triggers/new-flex-cluster.ts";
import newDatabaseUser from "../../triggers/new-database-user.ts";
import newOrganization from "../../triggers/new-organization.ts";
import newProject from "../../triggers/new-project.ts";

const BASE = "https://cloud.mongodb.com/api/atlas/v2";
const PROJECT = "5f8d0d55b54eff0f2b2c3d4e";

interface Case {
  trigger: typeof newAlert;
  params: Record<string, unknown>;
  url: (pageNum: number) => string;
  item: (id: string) => Record<string, unknown>;
}

const cases: Case[] = [
  {
    trigger: newAlert,
    params: { projectId: PROJECT },
    url: (n) => `${BASE}/groups/${PROJECT}/alerts?status=OPEN&itemsPerPage=500&pageNum=${n}`,
    item: (id) => ({ id, status: "OPEN" }),
  },
  {
    trigger: newCluster,
    params: { projectId: PROJECT },
    url: (n) => `${BASE}/groups/${PROJECT}/clusters?itemsPerPage=500&pageNum=${n}`,
    item: (id) => ({ id, name: `name-${id}` }),
  },
  {
    trigger: newFlexCluster,
    params: { projectId: PROJECT },
    url: (n) => `${BASE}/groups/${PROJECT}/flexClusters?itemsPerPage=500&pageNum=${n}`,
    item: (id) => ({ id, name: `name-${id}` }),
  },
  {
    trigger: newDatabaseUser,
    params: { projectId: PROJECT },
    url: (n) => `${BASE}/groups/${PROJECT}/databaseUsers?itemsPerPage=500&pageNum=${n}`,
    item: (id) => ({ username: id, databaseName: "admin" }),
  },
  {
    trigger: newOrganization,
    params: {},
    url: (n) => `${BASE}/orgs?itemsPerPage=500&pageNum=${n}`,
    item: (id) => ({ id }),
  },
  {
    trigger: newProject,
    params: {},
    url: (n) => `${BASE}/groups?itemsPerPage=500&pageNum=${n}`,
    item: (id) => ({ id }),
  },
];

for (const c of cases) {
  const key = c.trigger.key;
  const run = async (state: unknown, ids: string[]) => {
    const mock = mockCtx([{ body: { results: ids.map(c.item), totalCount: ids.length } }]);
    const result = await c.trigger.poll!(
      { params: c.params, subscriptionId: "sub-1", state },
      mock.ctx,
    );
    return { result, calls: mock.calls };
  };

  test(`${key}: the first check seeds without emitting`, async () => {
    const { result } = await run({}, ["a"]);
    assertEquals(result.events, []);
    assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
  });

  test(`${key}: a new record is emitted once and a retry repeats it identically`, async () => {
    const seeded = (await run({}, ["a"])).result.nextState;
    const first = await run(seeded, ["b", "a"]);
    const retry = await run(seeded, ["b", "a"]);
    assertEquals(first.result.events, [c.item("b")]);
    assertEquals(retry.result, first.result);
  });

  test(`${key}: requests exactly the list action's endpoint`, async () => {
    const { calls } = await run({}, ["a"]);
    assertEquals(calls.length, 1);
    assertEquals({ method: calls[0].method, url: calls[0].url }, {
      method: "GET",
      url: c.url(1),
    });
  });
}

test("snapshot triggers page through the whole collection (page 2 follows a full page)", async () => {
  const full = Array.from({ length: 500 }, (_, i) => ({ id: `p${i}` }));
  const mock = mockCtx([
    { body: { results: full, totalCount: 501 } },
    { body: { results: [{ id: "p500" }], totalCount: 501 } },
  ]);
  const res = await newProject.poll!({ params: {}, subscriptionId: "s", state: {} }, mock.ctx);
  assertEquals(res.events, []);
  assertEquals(mock.calls.map((c) => c.url), [
    `${BASE}/groups?itemsPerPage=500&pageNum=1`,
    `${BASE}/groups?itemsPerPage=500&pageNum=2`,
  ]);
  const again = mockCtx([
    { body: { results: full, totalCount: 502 } },
    { body: { results: [{ id: "p500" }, { id: "p501" }], totalCount: 502 } },
  ]);
  const later = await newProject.poll!(
    { params: {}, subscriptionId: "s", state: res.nextState },
    again.ctx,
  );
  assertEquals(later.events, [{ id: "p501" }]);
});

test("project-scoped triggers refuse a blank project id before any request", async () => {
  for (const t of [newAlert, newCluster, newFlexCluster, newDatabaseUser]) {
    const mock = mockCtx([]);
    await rejects(() => t.poll!({ params: {}, subscriptionId: "s", state: {} }, mock.ctx));
    assertEquals(mock.calls.length, 0);
  }
});

test("new-database-user: the same username in two authentication databases is two users", async () => {
  const user = (username: string, databaseName: string) => ({ username, databaseName });
  const run = async (state: unknown, results: unknown[]) => {
    const mock = mockCtx([{ body: { results, totalCount: results.length } }]);
    return await newDatabaseUser.poll!(
      { params: { projectId: PROJECT }, subscriptionId: "s", state },
      mock.ctx,
    );
  };
  const seeded = (await run({}, [user("reader", "admin")])).nextState;
  const next = await run(seeded, [user("reader", "admin"), user("reader", "$external")]);
  assertEquals(next.events, [user("reader", "$external")]);
});
