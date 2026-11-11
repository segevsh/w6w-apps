import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newDeal from "../../triggers/new-deal.ts";
import newTask from "../../triggers/new-task.ts";
import newLeadEvent from "../../triggers/new-lead-event.ts";
import newAppointment from "../../triggers/new-appointment.ts";
import newUser from "../../triggers/new-user.ts";
import newPipeline from "../../triggers/new-pipeline.ts";
import newSmartList from "../../triggers/new-smart-list.ts";
import newActionPlan from "../../triggers/new-action-plan.ts";

const BASE = "https://api.followupboss.com/v1";
const wrap = (collection: string, items: unknown[], next: string | null = null) => ({
  _metadata: { collection, total: items.length, limit: 100, offset: 0, next, nextLink: null },
  [collection]: items,
});
const rec = (id: number) => ({ id, name: `r${id}` });

// Table-driven: every new trigger shares one case set; each request URL is a literal.
const specs = [
  { name: "new-deal", trigger: newDeal, col: "deals", url: `${BASE}/deals?limit=100` },
  { name: "new-task", trigger: newTask, col: "tasks", url: `${BASE}/tasks?limit=100` },
  { name: "new-lead-event", trigger: newLeadEvent, col: "events", url: `${BASE}/events?limit=100` },
  {
    name: "new-appointment",
    trigger: newAppointment,
    col: "appointments",
    url: `${BASE}/appointments?limit=100`,
  },
  { name: "new-user", trigger: newUser, col: "users", url: `${BASE}/users?limit=100` },
  { name: "new-pipeline", trigger: newPipeline, col: "pipelines", url: `${BASE}/pipelines` },
  {
    name: "new-smart-list",
    trigger: newSmartList,
    col: "smartlists",
    url: `${BASE}/smartLists?limit=100&all=true`,
  },
  {
    name: "new-action-plan",
    trigger: newActionPlan,
    col: "actionPlans",
    url: `${BASE}/actionPlans?limit=100&status=Active`,
  },
];

for (const { name, trigger, col, url } of specs) {
  const input = { params: {}, subscriptionId: "sub-1" };
  const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: wrap(col, items) }]);

  test(`${name}: seeds without emitting, emits only the new item, retries idempotently`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([rec(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [rec(2), rec(1)];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [rec(2)]);
    assertEquals(retry, first);
  });

  test(`${name}: sends the list action's literal request`, async () => {
    const seed = ctx([rec(1)]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
  });
}

test("snapshot triggers follow the keyset cursor through every page", async () => {
  const input = { params: {}, subscriptionId: "sub-1" };
  const seeded = await newSmartList.poll!(
    { ...input, state: {} },
    mockCtx([
      { body: wrap("smartlists", [rec(1), rec(2)], "cursor-1") },
      { body: wrap("smartlists", [rec(3)]) },
    ]).ctx,
  );
  assertEquals(seeded.events, []);
  const mock = mockCtx([
    { body: wrap("smartlists", [rec(1), rec(2)], "cursor-1") },
    { body: wrap("smartlists", [rec(3), rec(4)]) },
  ]);
  const next = await newSmartList.poll!({ ...input, state: seeded.nextState }, mock.ctx);
  assertEquals(next.events, [rec(4)]);
  assertEquals(mock.calls.map((c) => c.url), [
    `${BASE}/smartLists?limit=100&all=true`,
    `${BASE}/smartLists?limit=100&next=cursor-1&all=true`,
  ]);
});
