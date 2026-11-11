import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newSystem from "../../triggers/new-system.ts";
import newCommandResult from "../../triggers/new-command-result.ts";
import newCommand from "../../triggers/new-command.ts";
import newOrganization from "../../triggers/new-organization.ts";
import newSystemGroup from "../../triggers/new-system-group.ts";
import newUserGroup from "../../triggers/new-user-group.ts";
import newUserGroupMember from "../../triggers/new-user-group-member.ts";
import newUserSshkey from "../../triggers/new-user-sshkey.ts";

const BASE = "https://console.jumpcloud.com/api";

interface Case {
  trigger: typeof newSystem;
  params: Record<string, unknown>;
  /** The literal request the wrapped list action makes. */
  url: string;
  /** Build one record with the given id; the V1 API wraps lists in `{results}`, V2 sends bare arrays. */
  item: (id: string) => Record<string, unknown>;
  wrap: (items: unknown[]) => unknown;
}

const v1 = (items: unknown[]) => ({ results: items, totalCount: items.length });
const bare = (items: unknown[]) => items;

const cases: Case[] = [
  {
    trigger: newSystem,
    params: {},
    url: `${BASE}/systems?sort=-created&limit=100&skip=0`,
    item: (id) => ({ _id: id }),
    wrap: v1,
  },
  {
    trigger: newCommandResult,
    params: {},
    url: `${BASE}/commandresults?sort=-requestTime&limit=100&skip=0`,
    item: (id) => ({ _id: id }),
    wrap: v1,
  },
  {
    trigger: newCommand,
    params: {},
    url: `${BASE}/commands?limit=100&skip=0`,
    item: (id) => ({ _id: id }),
    wrap: v1,
  },
  {
    trigger: newOrganization,
    params: {},
    url: `${BASE}/organizations?limit=100&skip=0`,
    item: (id) => ({ _id: id }),
    wrap: v1,
  },
  {
    trigger: newSystemGroup,
    params: {},
    url: `${BASE}/v2/systemgroups?limit=100&skip=0`,
    item: (id) => ({ id }),
    wrap: bare,
  },
  {
    trigger: newUserGroup,
    params: {},
    url: `${BASE}/v2/usergroups?limit=100&skip=0`,
    item: (id) => ({ id }),
    wrap: bare,
  },
  {
    trigger: newUserGroupMember,
    params: { groupId: "g1" },
    url: `${BASE}/v2/usergroups/g1/membership?limit=100&skip=0`,
    item: (id) => ({ id, type: "user" }),
    wrap: bare,
  },
];

for (const c of cases) {
  const key = c.trigger.key;
  const run = async (state: unknown, ids: string[]) => {
    const mock = mockCtx([{ body: c.wrap(ids.map(c.item)) }]);
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
    assertEquals({ method: calls[0].method, url: calls[0].url }, { method: "GET", url: c.url });
  });
}

test("new-user-sshkey: seeds, emits a new key once, requests the user's key list", async () => {
  const key = (id: string) => ({ _id: id, name: id });
  const run = async (state: unknown, ids: string[]) => {
    const mock = mockCtx([{ body: ids.map(key) }]);
    const result = await newUserSshkey.poll!(
      { params: { userId: "u1" }, subscriptionId: "sub-1", state },
      mock.ctx,
    );
    return { result, calls: mock.calls };
  };
  const seed = await run({}, ["a"]);
  assertEquals(seed.result.events, []);
  assertEquals((seed.result.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    { method: seed.calls[0].method, url: seed.calls[0].url },
    { method: "GET", url: `${BASE}/systemusers/u1/sshkeys` },
  );
  const first = await run(seed.result.nextState, ["b", "a"]);
  const retry = await run(seed.result.nextState, ["b", "a"]);
  assertEquals(first.result.events, [key("b")]);
  assertEquals(retry.result, first.result);
});

test("new-user-group-member and new-user-sshkey refuse a blank parent id before any request", async () => {
  for (const t of [newUserGroupMember, newUserSshkey]) {
    const mock = mockCtx([]);
    await assertRejects(
      async () => await t.poll!({ params: {}, subscriptionId: "s", state: {} }, mock.ctx),
      Error,
    );
    assertEquals(mock.calls.length, 0);
  }
});

test("snapshot triggers: records that vanish or are edited are not new", async () => {
  const mock = (ids: string[]) =>
    mockCtx([{ body: v1(ids.map((id) => ({ _id: id, name: id === "a" ? "renamed" : id }))) }]).ctx;
  const seeded = await newCommand.poll!(
    { params: {}, subscriptionId: "s", state: {} },
    mockCtx([{ body: v1([{ _id: "a", name: "a" }, { _id: "z", name: "z" }]) }]).ctx,
  );
  const res = await newCommand.poll!(
    { params: {}, subscriptionId: "s", state: seeded.nextState },
    mock(["a"]),
  );
  assertEquals(res.events, []);
});
