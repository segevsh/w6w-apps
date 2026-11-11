import { describe, test } from "node:test";
import nodeAssert from "node:assert/strict";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import newClient from "../../triggers/new-client.ts";
import newMember from "../../triggers/new-member.ts";
import newTask from "../../triggers/new-task.ts";
import newTeam from "../../triggers/new-team.ts";
import newOrganization from "../../triggers/new-organization.ts";
import newTimesheet, { clock } from "../../triggers/new-timesheet.ts";

const ROOT = "https://api.hubstaff.com/v2";

interface Case {
  name: string;
  trigger: typeof newClient;
  params: Record<string, unknown>;
  resource: string;
  idKey: string;
  url: string;
}

const cases: Case[] = [
  {
    name: "new-client",
    trigger: newClient,
    params: { organizationId: 7 },
    resource: "clients",
    idKey: "id",
    url: `${ROOT}/organizations/7/clients?status=all&page_limit=100`,
  },
  {
    name: "new-member",
    trigger: newMember,
    params: { organizationId: 7 },
    resource: "members",
    idKey: "user_id",
    url: `${ROOT}/organizations/7/members?page_limit=100`,
  },
  {
    name: "new-task",
    trigger: newTask,
    params: { organizationId: 7 },
    resource: "tasks",
    idKey: "id",
    url: `${ROOT}/organizations/7/tasks?page_limit=100`,
  },
  {
    name: "new-team",
    trigger: newTeam,
    params: { organizationId: 7 },
    resource: "teams",
    idKey: "id",
    url: `${ROOT}/organizations/7/teams?page_limit=100`,
  },
  {
    name: "new-organization",
    trigger: newOrganization,
    params: {},
    resource: "organizations",
    idKey: "id",
    url: `${ROOT}/organizations?page_limit=100`,
  },
  {
    name: "new-timesheet",
    trigger: newTimesheet,
    params: { organizationId: 7 },
    resource: "timesheets",
    idKey: "id",
    // clock pinned to 1_700_000_000_000 ms = 2023-11-14; 90 days earlier = 2023-08-16.
    url:
      `${ROOT}/organizations/7/timesheets?date%5Bstart%5D=2023-08-16&date%5Bstop%5D=2023-11-14&page_limit=100`,
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const run = async (state: unknown, ids: number[]) => {
      const original = clock.now;
      clock.now = () => 1_700_000_000_000;
      try {
        const m = mockCtx([{
          body: listEnvelope(c.resource, ids.map((id) => ({ [c.idKey]: id }))),
        }]);
        const out = await c.trigger.poll!({ params: c.params, state }, m.ctx);
        return { out, calls: m.calls };
      } finally {
        clock.now = original;
      }
    };

    test("seeds without emitting", async () => {
      const { out } = await run({}, [1]);
      assertEquals(out.events, []);
      assertEquals(out.nextState.seeded, true);
    });

    test("emits only the new record, and a retry is identical", async () => {
      const seeded = await run({}, [1]);
      const first = await run(seeded.out.nextState, [1, 2]);
      assertEquals(first.out.events, [{ [c.idKey]: 2 }]);
      assertEquals((await run(seeded.out.nextState, [1, 2])).out, first.out);
    });

    test("requests the literal endpoint", async () => {
      const { calls } = await run({}, [1]);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "GET");
      assertEquals(calls[0].url, c.url);
    });
  });
}

test("new-task follows next_page_start_id across pages", async () => {
  const m = mockCtx([
    { body: listEnvelope("tasks", [{ id: 1 }], 50) },
    { body: listEnvelope("tasks", [{ id: 2 }], 90) },
    { body: listEnvelope("tasks", [{ id: 3 }]) },
  ]);
  const seeded = await newTask.poll!({ params: { organizationId: 7 }, state: {} }, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals(m.calls.map((call) => call.url), [
    `${ROOT}/organizations/7/tasks?page_limit=100`,
    `${ROOT}/organizations/7/tasks?page_start_id=50&page_limit=100`,
    `${ROOT}/organizations/7/tasks?page_start_id=90&page_limit=100`,
  ]);
  const next = await newTask.poll!(
    { params: { organizationId: 7 }, state: seeded.nextState },
    mockCtx([
      { body: listEnvelope("tasks", [{ id: 1 }], 50) },
      { body: listEnvelope("tasks", [{ id: 2 }], 90) },
      { body: listEnvelope("tasks", [{ id: 3 }, { id: 4 }]) },
    ]).ctx,
  );
  assertEquals(next.events, [{ id: 4 }]);
});

test("a collection past the 5000-record ceiling fails loudly instead of truncating", async () => {
  const pages = Array.from({ length: 60 }, (_, i) => ({
    body: listEnvelope("tasks", [{ id: i }], i + 1),
  }));
  await nodeAssert.rejects(
    () => newTask.poll!({ params: { organizationId: 7 }, state: {} }, mockCtx(pages).ctx),
    /more than 5000/,
  );
});
