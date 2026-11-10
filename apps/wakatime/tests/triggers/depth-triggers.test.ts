import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newGoal from "../../triggers/new-goal.ts";
import newOrUpdatedGoal from "../../triggers/new-or-updated-goal.ts";
import newLeaderboard from "../../triggers/new-leaderboard.ts";
import newOrganization from "../../triggers/new-organization.ts";
import newDashboard from "../../triggers/new-dashboard.ts";
import newDataDump from "../../triggers/new-data-dump.ts";

const BASE = "https://api.wakatime.com/api/v1/users/current";
const res = (data: unknown[]) => ({ body: { data } });

// Table-driven: the bounded-collection (pollSnapshot) triggers share one case set.
const specs = [
  { name: "new-goal", trigger: newGoal, params: {}, url: `${BASE}/goals` },
  { name: "new-or-updated-goal", trigger: newOrUpdatedGoal, params: {}, url: `${BASE}/goals` },
  { name: "new-leaderboard", trigger: newLeaderboard, params: {}, url: `${BASE}/leaderboards` },
  { name: "new-organization", trigger: newOrganization, params: {}, url: `${BASE}/orgs` },
  {
    name: "new-dashboard",
    trigger: newDashboard,
    params: { orgId: "org-sample" },
    url: `${BASE}/orgs/org-sample/dashboards`,
  },
  { name: "new-data-dump", trigger: newDataDump, params: {}, url: `${BASE}/data_dumps` },
];

for (const { name, trigger, params, url } of specs) {
  const input = { params, subscriptionId: "sub-1" };
  const old = [{ id: "a", modified_at: "2026-11-01T00:00:00Z" }];
  const fresh = { id: "b", modified_at: "2026-11-02T00:00:00Z" };

  test(`${name}: seeds, emits only the new record, retries idempotently, literal request`, async () => {
    const c = mockCtx([res(old)]);
    const seeded = await trigger.poll!({ ...input, state: {} }, c.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(c.calls[0].method, "GET");
    assertEquals(c.calls[0].url, url);
    assertEquals(c.calls[0].body, null);
    const run = () =>
      trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([res([fresh, ...old])]).ctx);
    const r = await run();
    assertEquals(r.events, [fresh]);
    assertEquals(await run(), r);
  });
}

test("new-goal: an edited goal is not an event, new-or-updated-goal: it is", async () => {
  const input = { params: {}, subscriptionId: "sub-1" };
  const v1 = [{ id: "g", modified_at: "2026-11-01T00:00:00Z" }];
  const v2 = [{ id: "g", modified_at: "2026-11-09T00:00:00Z" }];
  const a = await newGoal.poll!({ ...input, state: {} }, mockCtx([res(v1)]).ctx);
  assertEquals(
    (await newGoal.poll!({ ...input, state: a.nextState }, mockCtx([res(v2)]).ctx)).events,
    [],
  );
  const b = await newOrUpdatedGoal.poll!({ ...input, state: {} }, mockCtx([res(v1)]).ctx);
  assertEquals(
    (await newOrUpdatedGoal.poll!({ ...input, state: b.nextState }, mockCtx([res(v2)]).ctx)).events,
    v2,
  );
});
