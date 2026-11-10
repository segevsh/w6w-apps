import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newProject from "../../triggers/new-project.ts";
import newTask from "../../triggers/new-task.ts";
import newSection from "../../triggers/new-section.ts";
import newExpense from "../../triggers/new-expense.ts";
import newUser from "../../triggers/new-user.ts";
import newAssignment from "../../triggers/new-assignment.ts";
import newTimeRecord from "../../triggers/new-time-record.ts";
import newTimecard from "../../triggers/new-timecard.ts";

const NOW = Date.parse("2026-11-10T12:00:00Z");
const B = "https://api.everhour.com";

interface Case {
  name: string;
  trigger: typeof newProject;
  params: Record<string, unknown>;
  row: (n: number) => Record<string, unknown>;
  url: string;
}

const cases: Case[] = [
  {
    name: "new-project",
    trigger: newProject,
    params: {},
    row: (n) => ({ id: `ev:${n}`, name: `Project ${n}`, users: [] }),
    url: `${B}/projects?limit=100&page=1`,
  },
  {
    name: "new-task",
    trigger: newTask,
    params: { projectId: "ev:77" },
    row: (n) => ({ id: `ev:t${n}`, name: `Task ${n}` }),
    url: `${B}/projects/ev:77/tasks?limit=250&page=1`,
  },
  {
    name: "new-section",
    trigger: newSection,
    params: { projectId: "ev:77" },
    row: (n) => ({ id: n, name: `Section ${n}` }),
    url: `${B}/projects/ev:77/sections`,
  },
  {
    name: "new-expense",
    trigger: newExpense,
    params: {},
    row: (n) => ({ id: n, amount: 100 * n }),
    url: `${B}/expenses`,
  },
  {
    name: "new-user",
    trigger: newUser,
    params: {},
    row: (n) => ({ id: n, name: `User ${n}` }),
    url: `${B}/team/users`,
  },
  {
    name: "new-assignment",
    trigger: newAssignment,
    params: {},
    row: (n) => ({ id: n, type: "project", user: 1 }),
    url: `${B}/resource-planner/assignments`,
  },
  {
    name: "new-time-record",
    trigger: newTimeRecord,
    params: {},
    row: (n) => ({ id: n, time: 60 * n, user: 1, date: "2026-11-10" }),
    url: `${B}/team/time?from=2026-11-07&to=2026-11-10&page=1&limit=1000`,
  },
  {
    name: "new-timecard",
    trigger: newTimecard,
    params: { lookbackDays: 5 },
    row: (n) => ({ user: n, date: "2026-11-10", clockIn: "09:00" }),
    url: `${B}/timecards?from=2026-11-05&to=2026-11-10`,
  },
];

async function withNow<T>(fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => NOW;
  try {
    return await fn();
  } finally {
    Date.now = real;
  }
}

describe("new-timecard key", () => {
  test("two timecards for one user on different dates stay distinct", async () => {
    await withNow(async () => {
      const row = (date: string) => ({ user: 1, date, clockIn: "09:00" });
      const input = (state: unknown) => ({ params: {}, state, subscriptionId: "sub_1" });
      const seeded = await newTimecard.poll!(
        input({}),
        mockCtx([{ body: [row("2026-11-09")] }]).ctx,
      );
      const next = await newTimecard.poll!(
        input(seeded.nextState),
        mockCtx([{ body: [row("2026-11-09"), row("2026-11-10")] }]).ctx,
      );
      assertEquals(next.events, [row("2026-11-10")]);
    });
  });
});

describe("record poll triggers", () => {
  for (const c of cases) {
    const input = (state: unknown) => ({ params: c.params, state, subscriptionId: "sub_1" });

    test(`${c.name}: declares a non-empty output and a sample`, () => {
      assertEquals(c.trigger.key, c.name);
      assertEquals((c.trigger.output ?? []).length > 0, true);
      assertEquals(c.trigger.sample !== undefined, true);
      assertEquals(c.trigger.onSubscribe, undefined);
    });

    test(`${c.name}: seeds without events, then emits only the new record`, async () => {
      await withNow(async () => {
        const seed = mockCtx([{ body: [c.row(1), c.row(2)] }]);
        const seeded = await c.trigger.poll!(input({}), seed.ctx);
        assertEquals(seeded.events, []);
        assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

        const next = mockCtx([{ body: [c.row(1), c.row(2), c.row(3)] }]);
        const result = await c.trigger.poll!(input(seeded.nextState), next.ctx);
        assertEquals(result.events, [c.row(3)]);
      });
    });

    test(`${c.name}: the same state and response give the same result (idempotent retry)`, async () => {
      await withNow(async () => {
        const seed = mockCtx([{ body: [c.row(1)] }]);
        const seeded = await c.trigger.poll!(input({}), seed.ctx);
        const body = [c.row(1), c.row(2)];
        const a = await c.trigger.poll!(input(seeded.nextState), mockCtx([{ body }]).ctx);
        const b = await c.trigger.poll!(input(seeded.nextState), mockCtx([{ body }]).ctx);
        assertEquals(a, b);
        assertEquals(a.events, [c.row(2)]);
      });
    });

    test(`${c.name}: sends the literal request`, async () => {
      await withNow(async () => {
        const { ctx, calls } = mockCtx([{ body: [] }]);
        await c.trigger.poll!(input({}), ctx);
        assertEquals(calls.length, 1);
        assertEquals(calls[0].method, "GET");
        assertEquals(calls[0].url, c.url);
      });
    });

    test(`${c.name}: an edited record does not emit`, async () => {
      await withNow(async () => {
        const seeded = await c.trigger.poll!(
          input({}),
          mockCtx([{ body: [{ ...c.row(1), edited: false }] }]).ctx,
        );
        const result = await c.trigger.poll!(
          input(seeded.nextState),
          mockCtx([{ body: [{ ...c.row(1), edited: true }] }]).ctx,
        );
        assertEquals(result.events, []);
      });
    });
  }
});

describe("record poll triggers: paging", () => {
  const task = (n: number) => ({ id: `ev:t${n}`, name: `Task ${n}` });
  const page = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => task(from + i));
  const input = (state: unknown) => ({
    params: { projectId: "ev:77" },
    state,
    subscriptionId: "sub_1",
  });

  test("new-task: reads every page until a short one and emits a record on page 2", async () => {
    const seed = mockCtx([{ body: page(1, 250) }, { body: page(251, 10) }]);
    const seeded = await newTask.poll!(input({}), seed.ctx);
    assertEquals(seed.calls.map((c) => c.url), [
      `${B}/projects/ev:77/tasks?limit=250&page=1`,
      `${B}/projects/ev:77/tasks?limit=250&page=2`,
    ]);
    const next = mockCtx([{ body: page(1, 250) }, { body: page(251, 11) }]);
    const result = await newTask.poll!(input(seeded.nextState), next.ctx);
    assertEquals(result.events, [task(261)]);
  });

  test("new-task: a project longer than 8 pages fails loudly instead of reading part of it", async () => {
    const full = Array.from({ length: 9 }, (_, i) => ({ body: page(i * 250 + 1, 250) }));
    const { ctx } = mockCtx(full);
    await assertRejects(() => newTask.poll!(input({}), ctx), Error, "more than 8 pages");
  });
});
