import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newCall from "../../triggers/new-call.ts";
import newOrUpdatedCall from "../../triggers/new-or-updated-call.ts";
import newUser from "../../triggers/new-user.ts";
import newTeam from "../../triggers/new-team.ts";
import newClientCompany from "../../triggers/new-client-company.ts";
import newClientTeam from "../../triggers/new-client-team.ts";
import newClientUser from "../../triggers/new-client-user.ts";

const BASE = "https://public-api.leexi.ai/v1";
const sub = { subscriptionId: "sub-1" };
const run = (
  t: typeof newCall,
  params: Record<string, unknown>,
  state: unknown,
  responses: Array<{ body: unknown }>,
) => t.poll!({ params, state, ...sub }, mockCtx(responses).ctx);

const calls = [
  {
    trigger: newCall,
    url: `${BASE}/calls?page=1&items=100&order=created_at%20desc`,
    old: { uuid: "c-old", created_at: "2026-11-01T00:00:00.000Z", updated_at: "x" },
    fresh: { uuid: "c-new", created_at: "2026-11-02T00:00:00.000Z", updated_at: "y" },
  },
  {
    trigger: newOrUpdatedCall,
    url: `${BASE}/calls?page=1&items=100&order=updated_at%20desc`,
    old: { uuid: "c-old", updated_at: "2026-11-01T00:00:00.000Z" },
    fresh: { uuid: "c-new", updated_at: "2026-11-02T00:00:00.000Z" },
  },
];

for (const c of calls) {
  test(`${c.trigger.key}: seeds, emits the unseen call, retries identically, sends the literal request`, async () => {
    const seed = mockCtx([{ body: { data: [c.old] } }]);
    const seeded = await c.trigger.poll!({ params: {}, state: {}, ...sub }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
    const resp = [{ body: { data: [c.fresh, c.old] } }];
    const first = await run(c.trigger, {}, seeded.nextState, resp);
    const second = await run(c.trigger, {}, seeded.nextState, resp);
    assertEquals(first.events, [c.fresh]);
    assertEquals(first, second);
  });
}

test("new-or-updated-call: an edit of an old call is a new event", async () => {
  const old = { uuid: "c1", updated_at: "2026-11-01T00:00:00.000Z" };
  const seeded = await run(newOrUpdatedCall, {}, {}, [{ body: { data: [old] } }]);
  const edited = { uuid: "c1", updated_at: "2026-11-10T09:00:00.000Z" };
  const out = await run(newOrUpdatedCall, {}, seeded.nextState, [{
    body: { data: [edited, old] },
  }]);
  assertEquals(out.events, [edited]);
});

const snaps = [
  { trigger: newUser, params: {}, url: `${BASE}/users?page=1&items=100` },
  { trigger: newTeam, params: {}, url: `${BASE}/teams?page=1&items=100` },
  { trigger: newClientCompany, params: {}, url: `${BASE}/reseller/companies?page=1&items=100` },
  {
    trigger: newClientTeam,
    params: { company_uuid: "co1" },
    url: `${BASE}/reseller/companies/co1/teams?page=1&items=100`,
  },
  {
    trigger: newClientUser,
    params: { company_uuid: "co1" },
    url: `${BASE}/reseller/companies/co1/users?page=1&items=100`,
  },
];

for (const s of snaps) {
  const rec = (uuid: string) => ({ uuid, name: `Record ${uuid}` });
  const page = (...ids: string[]) => ({
    body: { data: ids.map(rec), pagination: { page: 1, items: 100, count: ids.length, pages: 1 } },
  });
  test(`${s.trigger.key}: seeds, emits only the new record, retries identically, sends the literal request`, async () => {
    const seed = mockCtx([page("a")]);
    const seeded = await s.trigger.poll!({ params: s.params, state: {}, ...sub }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, s.url);
    const first = await run(s.trigger, s.params, seeded.nextState, [page("a", "b")]);
    const second = await run(s.trigger, s.params, seeded.nextState, [page("a", "b")]);
    assertEquals(first.events, [rec("b")]);
    assertEquals(first, second);
  });
}

test("new-user: reads every page the pagination block announces", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ uuid: `u${i}` }));
  const m = mockCtx([
    { body: { data: full, pagination: { page: 1, items: 100, count: 101, pages: 2 } } },
    {
      body: { data: [{ uuid: "u100" }], pagination: { page: 2, items: 100, count: 101, pages: 2 } },
    },
  ]);
  await newUser.poll!({ params: {}, state: {}, ...sub }, m.ctx);
  assertEquals(m.calls.map((c) => c.url), [
    `${BASE}/users?page=1&items=100`,
    `${BASE}/users?page=2&items=100`,
  ]);
});

test("new-client-team: a missing company is refused by the wrapped action", async () => {
  await assertRejects(
    () => newClientTeam.poll!({ params: {}, state: {}, ...sub }, mockCtx([]).ctx),
    Error,
  );
});
