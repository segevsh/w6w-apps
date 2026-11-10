import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, ok } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import newAgent from "../../triggers/new-agent.ts";
import newBatchCall from "../../triggers/new-batch-call.ts";
import newBatchCallRecipient from "../../triggers/new-batch-call-recipient.ts";
import newKnowledgeBase from "../../triggers/new-knowledge-base.ts";
import newPhoneNumber from "../../triggers/new-phone-number.ts";

const B = "https://api.synthflow.ai/v2";
const page = (key: string, rows: unknown[], total: number): MockResponse => ({
  body: ok({ pagination: { total_records: total, limit: 100, offset: 0 }, [key]: rows }),
});

interface Case {
  trigger: TriggerDefinition;
  params: Record<string, unknown>;
  path: string;
  /** Wrap `rows` as the vendor does, claiming `total` records overall. */
  respond(rows: unknown[], total: number): MockResponse;
  row(n: number): Record<string, unknown>;
}
const CASES: Case[] = [
  {
    trigger: newAgent,
    params: {},
    path: "/assistants/",
    respond: (rows, total) => page("assistants", rows, total),
    row: (n) => ({ model_id: `agent-${n}`, name: `Agent ${n}` }),
  },
  {
    trigger: newBatchCall,
    params: {},
    path: "/calls/batch",
    respond: (rows, total) => page("batch_calls", rows, total),
    row: (n) => ({ batch_call_id: `batch-${n}`, name: `Batch ${n}`, status: "pending" }),
  },
  {
    trigger: newBatchCallRecipient,
    params: { batch_call_id: "b-1" },
    path: "/calls/batch/b-1/tasks",
    respond: (rows, total) => page("tasks", rows, total),
    row: (n) => ({ task_id: `task-${n}`, to_phone_number: `+1415555000${n}`, status: "pending" }),
  },
  {
    trigger: newKnowledgeBase,
    params: {},
    path: "/knowledge_base",
    // knowledge bases carry the total beside the list, not in a pagination block
    respond: (rows, total) => ({ body: ok({ total_records: total, knowledge_bases: rows }) }),
    row: (n) => ({ id: `kb-${n}`, name: `KB ${n}` }),
  },
  {
    trigger: newPhoneNumber,
    params: { workspace: "ws-1" },
    path: "/numbers",
    respond: (rows, total) => page("phone_numbers", rows, total),
    row: (n) => ({ sid: `sid-${n}`, number: `+1415555000${n}`, is_available: true }),
  },
];

for (const c of CASES) {
  const key = c.trigger.key;
  const query = (offset: number) => {
    const ws = c.params.workspace ? `workspace=${c.params.workspace}&` : "";
    return `${B}${c.path}?${ws}limit=100&offset=${offset}`;
  };
  const run = (state: unknown, rs: MockResponse[]) => {
    const m = mockCtx(rs);
    return c.trigger.poll!({ params: c.params, state, subscriptionId: "sub-1" }, m.ctx).then((
      r,
    ) => ({ ...r, calls: m.calls }));
  };

  test(`${key}: seeds without flooding and sends the literal request`, async () => {
    const seeded = await run({}, [c.respond([c.row(1)], 1)]);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seeded.calls.length, 1);
    assertEquals(seeded.calls[0].method, "GET");
    assertEquals(seeded.calls[0].url, query(0));
  });

  test(`${key}: emits only the added row; a retry gives the same result; an edit is not new`, async () => {
    const seeded = await run({}, [c.respond([c.row(1)], 1)]);
    const first = await run(seeded.nextState, [c.respond([c.row(1), c.row(2)], 2)]);
    const retry = await run(seeded.nextState, [c.respond([c.row(1), c.row(2)], 2)]);
    assertEquals(first.events, [c.row(2)]);
    assertEquals(retry, first);
    const edited = await run(seeded.nextState, [c.respond([{ ...c.row(1), name: "renamed" }], 1)]);
    assertEquals(edited.events, []);
  });

  test(`${key}: reads the next offset page while the vendor total says there is more`, async () => {
    const full = Array.from({ length: 100 }, (_, i) => c.row(i + 1));
    const seeded = await run({}, [c.respond(full, 101), c.respond([c.row(101)], 101)]);
    assertEquals(seeded.calls.length, 2);
    assertEquals(seeded.calls[1].url, query(100));
    const next = await run(seeded.nextState, [
      c.respond(full, 102),
      c.respond([c.row(101), c.row(102)], 102),
    ]);
    assertEquals(next.events, [c.row(102)]);
  });

  test(`${key}: a list of more than 1000 rows is refused, not truncated`, async () => {
    const full = Array.from({ length: 100 }, (_, i) => c.row(i + 1));
    await assertRejects(() => run({}, Array.from({ length: 10 }, () => c.respond(full, 5000))));
  });
}
