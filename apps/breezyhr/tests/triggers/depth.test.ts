import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import newPosition from "../../triggers/new-position.ts";
import newOrUpdatedPosition from "../../triggers/new-or-updated-position.ts";
import newPositionCandidate from "../../triggers/new-position-candidate.ts";
import newCandidateMessage from "../../triggers/new-candidate-message.ts";
import newCandidateActivity from "../../triggers/new-candidate-activity.ts";

const B = "https://api.breezy.hr/v3/company/c1";
const item = (id: string) => ({ _id: id });
const sub = { subscriptionId: "s" };

interface Case {
  trigger: TriggerDefinition;
  key: string;
  params: Record<string, unknown>;
  url: string;
}

const cases: Case[] = [
  {
    trigger: newPosition as unknown as TriggerDefinition,
    key: "new-position",
    params: { companyId: "c1" },
    url: `${B}/positions`,
  },
  {
    trigger: newOrUpdatedPosition as unknown as TriggerDefinition,
    key: "new-or-updated-position",
    params: { companyId: "c1" },
    url: `${B}/positions`,
  },
  {
    trigger: newPositionCandidate as unknown as TriggerDefinition,
    key: "new-position-candidate",
    params: { companyId: "c1", positionId: "p1" },
    url: `${B}/position/p1/candidates`,
  },
  {
    trigger: newCandidateMessage as unknown as TriggerDefinition,
    key: "new-candidate-message",
    params: { companyId: "c1", positionId: "p1", candidateId: "k1" },
    url: `${B}/position/p1/candidate/k1/conversation`,
  },
  {
    trigger: newCandidateActivity as unknown as TriggerDefinition,
    key: "new-candidate-activity",
    params: { companyId: "c1", positionId: "p1", candidateId: "k1" },
    url: `${B}/position/p1/candidate/k1/stream`,
  },
];

for (const c of cases) {
  const input = { params: c.params, ...sub };
  test(`${c.key}: seeds, emits only the new record, retries identically`, async () => {
    const seeded = await c.trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: [item("b"), item("a")] }]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    const run = () =>
      c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: [item("c"), item("b"), item("a")] }]).ctx,
      );
    const first = await run();
    assertEquals(first.events, [item("c")]);
    assertEquals(await run(), first);
  });

  test(`${c.key}: the request is the literal list call`, async () => {
    const m = mockCtx([{ body: [item("a")] }]);
    await c.trigger.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(m.calls[0].url, c.url);
  });
}

test("new-or-updated-position: an edit (new updated_date) is emitted once, unchanged is quiet", async () => {
  const input = { params: { companyId: "c1" }, ...sub };
  const pos = (updated: string) => [{ _id: "p1", updated_date: updated }];
  const seeded = await newOrUpdatedPosition.poll!(
    { ...input, state: {} },
    mockCtx([{ body: pos("2026-11-01") }]).ctx,
  );
  const same = await newOrUpdatedPosition.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: pos("2026-11-01") }]).ctx,
  );
  assertEquals(same.events, []);
  const edited = await newOrUpdatedPosition.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: pos("2026-11-09") }]).ctx,
  );
  assertEquals(edited.events, pos("2026-11-09"));
});

test("new-position: an edit of a known position is not an event", async () => {
  const input = { params: { companyId: "c1" }, ...sub };
  const seeded = await newPosition.poll!(
    { ...input, state: {} },
    mockCtx([{ body: [{ _id: "p1", updated_date: "1" }] }]).ctx,
  );
  const after = await newPosition.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: [{ _id: "p1", updated_date: "2" }] }]).ctx,
  );
  assertEquals(after.events, []);
});
