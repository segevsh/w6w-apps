import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import newContactTag from "../../triggers/new-contact-tag.ts";
import newTeamMember from "../../triggers/new-team-member.ts";
import newSender from "../../triggers/new-sender.ts";
import newPipelineStep from "../../triggers/new-pipeline-step.ts";
import newCampaign from "../../triggers/new-campaign.ts";
import newDeal from "../../triggers/new-deal.ts";
import newOrUpdatedDeal from "../../triggers/new-or-updated-deal.ts";

const input = (params: Record<string, unknown>, state: unknown) => ({
  params,
  state,
  subscriptionId: "sub-1",
});
const CRM = "https://api.sendpulse.com/crm/v1";

interface Case {
  name: string;
  trigger: TriggerDefinition;
  params: Record<string, unknown>;
  method: string;
  url: string;
  body?: unknown;
  /** The vendor response holding these rows. */
  respond(rows: unknown[]): unknown;
  row(n: number): Record<string, unknown>;
}

const SNAPSHOTS: Case[] = [
  {
    name: "new-contact-tag",
    trigger: newContactTag,
    params: {},
    method: "GET",
    url: `${CRM}/contact-tags`,
    respond: (rows) => ({ success: true, data: rows }),
    row: (n) => ({ id: n, name: `tag ${n}` }),
  },
  {
    name: "new-team-member",
    trigger: newTeamMember,
    params: {},
    method: "GET",
    url: `${CRM}/users`,
    respond: (rows) => ({ success: true, data: rows }),
    row: (n) => ({ id: n, firstname: `user ${n}`, email: `u${n}@example.com` }),
  },
  {
    name: "new-sender",
    trigger: newSender,
    params: {},
    method: "GET",
    url: "https://api.sendpulse.com/senders",
    respond: (rows) => rows,
    row: (n) => ({ email: `s${n}@example.com`, name: `Sender ${n}` }),
  },
  {
    name: "new-pipeline-step",
    trigger: newPipelineStep,
    params: { pipelineId: 1201 },
    method: "GET",
    url: `${CRM}/pipelines/1201/steps`,
    respond: (rows) => ({ success: true, data: rows }),
    row: (n) => ({ id: n, pipelineId: 1201, name: `step ${n}` }),
  },
];

for (const c of SNAPSHOTS) {
  const run = (state: unknown, rows: unknown[]) => {
    const m = mockCtx([{ body: c.respond(rows) }]);
    return c.trigger.poll!(input(c.params, state), m.ctx).then((r) => ({ ...r, calls: m.calls }));
  };

  test(`${c.name}: seeds without flooding and sends the literal request`, async () => {
    const seeded = await run({}, [c.row(1)]);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seeded.calls.length, 1);
    assertEquals(seeded.calls[0].method, c.method);
    assertEquals(seeded.calls[0].url, c.url);
  });

  test(`${c.name}: emits only the row that was added, and a retry gives the same result`, async () => {
    const seeded = await run({}, [c.row(1)]);
    const first = await run(seeded.nextState, [c.row(1), c.row(2)]);
    const retry = await run(seeded.nextState, [c.row(1), c.row(2)]);
    assertEquals(first.events, [c.row(2)]);
    assertEquals(retry.events, first.events);
    assertEquals(retry.nextState, first.nextState);
  });

  test(`${c.name}: an edited existing row is not a new row`, async () => {
    const seeded = await run({}, [c.row(1)]);
    const r = await run(seeded.nextState, [{ ...c.row(1), name: "renamed" }]);
    assertEquals(r.events, []);
  });
}

const deal = (id: number, updatedAt: string) => ({
  id,
  pipelineId: 1201,
  name: `deal ${id}`,
  createdAt: "2026-11-09T09:00:00.000Z",
  updatedAt,
});
const dealPage = (rows: unknown[]): MockResponse => ({
  body: { success: true, data: rows, meta: { total: rows.length } },
});
const T1 = "2026-11-09T09:00:00.000Z";
const T2 = "2026-11-09T12:00:00.000Z";

for (
  const [trigger, field] of [[newDeal, "createdAt"], [newOrUpdatedDeal, "updatedAt"]] as const
) {
  const run = (state: unknown, rows: unknown[]) => {
    const m = mockCtx([dealPage(rows)]);
    return trigger.poll!(input({ pipelineId: 1201 }, state), m.ctx).then((r) => ({
      ...r,
      calls: m.calls,
    }));
  };
  test(`${trigger.key}: seeds, emits the new deal, is idempotent and sorts ${field} descending`, async () => {
    const seeded = await run({}, [deal(1, T1)]);
    assertEquals(seeded.events, []);
    assertEquals(seeded.calls[0].method, "POST");
    assertEquals(seeded.calls[0].url, `${CRM}/deals/get-list`);
    assertEquals(JSON.parse(seeded.calls[0].body ?? ""), {
      limit: 100,
      offset: 0,
      pipelineIds: [1201],
      sortBy: { fieldName: field, direction: "desc" },
    });
    const first = await run(seeded.nextState, [deal(2, T1), deal(1, T1)]);
    const retry = await run(seeded.nextState, [deal(2, T1), deal(1, T1)]);
    assertEquals(first.events, [deal(2, T1)]);
    assertEquals(retry.events, first.events);
  });
}

test("new-or-updated-deal: an edit to an OLD deal is a new event; new-deal ignores it", async () => {
  const seededU = await newOrUpdatedDeal.poll!(
    input({ pipelineId: 1201 }, {}),
    mockCtx([dealPage([deal(1, T1)])]).ctx,
  );
  const edited = await newOrUpdatedDeal.poll!(
    input({ pipelineId: 1201 }, seededU.nextState),
    mockCtx([dealPage([deal(1, T2)])]).ctx,
  );
  assertEquals(edited.events, [deal(1, T2)]);
  const seededN = await newDeal.poll!(
    input({ pipelineId: 1201 }, {}),
    mockCtx([dealPage([deal(1, T1)])]).ctx,
  );
  const same = await newDeal.poll!(
    input({ pipelineId: 1201 }, seededN.nextState),
    mockCtx([dealPage([deal(1, T2)])]).ctx,
  );
  assertEquals(same.events, []);
});

test("new-campaign: seeds, emits the new campaign, idempotent, literal order=desc request", async () => {
  const c = (id: number) => ({ id, name: `campaign ${id}`, status: 13 });
  const seed = mockCtx([{ body: [c(1)] }]);
  const seeded = await newCampaign.poll!(input({}, {}), seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.sendpulse.com/campaigns?limit=100&offset=0&order=desc",
  );
  const first = await newCampaign.poll!(
    input({}, seeded.nextState),
    mockCtx([{ body: [c(2), c(1)] }]).ctx,
  );
  const retry = await newCampaign.poll!(
    input({}, seeded.nextState),
    mockCtx([{ body: [c(2), c(1)] }]).ctx,
  );
  assertEquals(first.events, [c(2)]);
  assertEquals(retry, first);
});
