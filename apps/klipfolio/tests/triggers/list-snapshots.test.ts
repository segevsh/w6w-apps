import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newKlip from "../../triggers/new-klip.ts";
import newUser from "../../triggers/new-user.ts";
import newGroup from "../../triggers/new-group.ts";
import newClient from "../../triggers/new-client.ts";
import newDataSourceInstance from "../../triggers/new-data-source-instance.ts";
import newGroupUser from "../../triggers/new-group-user.ts";
import newKlipClientInstance from "../../triggers/new-klip-client-instance.ts";

const BASE = "https://app.klipfolio.com/api/1.0";

const cases = [
  { trigger: newKlip, params: {}, envKey: "klips", url: `${BASE}/klips?limit=100&offset=0` },
  { trigger: newUser, params: {}, envKey: "users", url: `${BASE}/users?limit=100&offset=0` },
  { trigger: newGroup, params: {}, envKey: "groups", url: `${BASE}/groups?limit=100&offset=0` },
  { trigger: newClient, params: {}, envKey: "clients", url: `${BASE}/clients?limit=100&offset=0` },
  {
    trigger: newDataSourceInstance,
    params: {},
    envKey: "datasources",
    url: `${BASE}/datasource-instances?limit=100&offset=0`,
  },
  {
    trigger: newGroupUser,
    params: { group_id: "g1" },
    envKey: "users",
    url: `${BASE}/groups/g1/users`,
  },
  {
    trigger: newKlipClientInstance,
    params: { klip_id: "k1" },
    envKey: "client_instances",
    url: `${BASE}/klips/k1/client-instances`,
  },
];

for (const { trigger, params, envKey, url } of cases) {
  const input = { params, subscriptionId: "sub-1" };
  const rec = (id: string) => ({ id, name: `Record ${id}` });
  const page = (...ids: string[]) => ({
    body: {
      data: { [envKey]: ids.map(rec) },
      meta: { success: true, count: ids.length, total: ids.length },
    },
  });

  test(`${trigger.key}: seeds, emits additions, retries idempotently, sends the literal request`, async () => {
    const seed = mockCtx([page("a")]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
    const run = () =>
      trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([page("a", "b")]).ctx);
    const first = await run();
    assertEquals(first.events, [{ change: "added", key: "b", values: rec("b") }]);
    assertEquals(await run(), first);
  });
}

test("new-group-user: a missing group id is refused by the wrapped action", async () => {
  await assertRejects(
    () => newGroupUser.poll!({ params: {}, subscriptionId: "s", state: {} }, mockCtx([]).ctx),
    Error,
  );
});

test("new-user: reads the next page while the total says there is more", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: `u${i}` }));
  const m = mockCtx([
    { body: { data: { users: full }, meta: { success: true, count: 100, total: 101 } } },
    { body: { data: { users: [{ id: "u100" }] }, meta: { success: true, count: 1, total: 101 } } },
  ]);
  await newUser.poll!({ params: {}, subscriptionId: "s", state: {} }, m.ctx);
  assertEquals(m.calls.map((c) => c.url), [
    `${BASE}/users?limit=100&offset=0`,
    `${BASE}/users?limit=100&offset=100`,
  ]);
});
