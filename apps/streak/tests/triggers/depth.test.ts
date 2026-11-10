import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import newPipeline from "../../triggers/new-pipeline.ts";
import newOrUpdatedPipeline from "../../triggers/new-or-updated-pipeline.ts";
import newStage from "../../triggers/new-stage.ts";
import newTask from "../../triggers/new-task.ts";
import newTeam from "../../triggers/new-team.ts";

const B = "https://api.streak.com/api/v1";
const T1 = 1762646400000;
const T2 = 1762732800000;
const pipe = (n: number, updated = T1) => ({
  key: `pipe_${n}`,
  name: `Pipeline ${n}`,
  creationTimestamp: T1 + n,
  lastUpdatedTimestamp: updated,
});

for (
  const [t, sort] of [[newPipeline, "creationTimestamp"], [
    newOrUpdatedPipeline,
    "lastUpdatedTimestamp",
  ]] as const
) {
  const run = (state: unknown, rows: unknown[]) => {
    const m = mockCtx([{ body: rows }]);
    return t.poll!({ params: {}, state, subscriptionId: "sub-1" }, m.ctx).then((r) => ({
      ...r,
      calls: m.calls,
    }));
  };
  test(`${t.key}: seeds, emits the new pipeline, is idempotent, sends the literal sortBy=${sort}`, async () => {
    const seeded = await run({}, [pipe(1)]);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seeded.calls[0].method, "GET");
    assertEquals(seeded.calls[0].url, `${B}/pipelines?sortBy=${sort}`);
    const first = await run(seeded.nextState, [pipe(2), pipe(1)]);
    const retry = await run(seeded.nextState, [pipe(2), pipe(1)]);
    assertEquals(first.events, [pipe(2)]);
    assertEquals(retry, first);
  });
}

test("new-or-updated-pipeline: an edit to an OLD pipeline is an event; new-pipeline ignores it", async () => {
  const run = (t: TriggerDefinition, state: unknown, rows: unknown[]) =>
    t.poll!(
      { params: {}, state, subscriptionId: "s" },
      mockCtx([{ body: rows }]).ctx,
    );
  const sU = (await run(newOrUpdatedPipeline, {}, [pipe(1)])).nextState;
  const sN = (await run(newPipeline, {}, [pipe(1)])).nextState;
  assertEquals((await run(newOrUpdatedPipeline, sU, [pipe(1, T2)])).events, [pipe(1, T2)]);
  assertEquals((await run(newPipeline, sN, [pipe(1, T2)])).events, []);
});

interface Case {
  trigger: TriggerDefinition;
  params: Record<string, unknown>;
  url: string;
  respond(rows: unknown[]): MockResponse;
  row(n: number): Record<string, unknown>;
}
const CASES: Case[] = [
  {
    trigger: newTeam,
    params: {},
    url: `${B}/users/me/teams`,
    respond: (rows) => ({ body: { results: rows } }),
    row: (n) => ({ key: `team_${n}`, name: `Team ${n}` }),
  },
  {
    trigger: newStage,
    params: { pipelineKey: "pipe_1" },
    url: `${B}/pipelines/pipe_1/stages`,
    // stages come back as an object keyed by stage key
    respond: (rows) => ({
      body: Object.fromEntries(rows.map((r) => [(r as { key: string }).key, r])),
    }),
    row: (n) => ({ key: `500${n}`, name: `Stage ${n}` }),
  },
  {
    trigger: newTask,
    params: { boxKey: "box_1" },
    url: `${B}/boxes/box_1/tasks`,
    respond: (rows) => ({ body: { results: rows } }),
    row: (n) => ({ key: `task_${n}`, boxKey: "box_1", text: `Task ${n}` }),
  },
];

for (const c of CASES) {
  const run = (state: unknown, rows: unknown[]) => {
    const m = mockCtx([c.respond(rows)]);
    return c.trigger.poll!({ params: c.params, state, subscriptionId: "sub-1" }, m.ctx).then((
      r,
    ) => ({ ...r, calls: m.calls }));
  };
  test(`${c.trigger.key}: seeds without flooding, literal request, emits only the added row`, async () => {
    const seeded = await run({}, [c.row(1)]);
    assertEquals(seeded.events, []);
    assertEquals(seeded.calls[0].method, "GET");
    assertEquals(seeded.calls[0].url, c.url);
    const first = await run(seeded.nextState, [c.row(1), c.row(2)]);
    const retry = await run(seeded.nextState, [c.row(1), c.row(2)]);
    assertEquals(first.events, [c.row(2)]);
    assertEquals(retry, first);
    const edited = await run(seeded.nextState, [{ ...c.row(1), name: "renamed" }]);
    assertEquals(edited.events, []);
  });
}
