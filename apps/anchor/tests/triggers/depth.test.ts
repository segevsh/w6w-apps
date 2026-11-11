import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import newPayout from "../../triggers/new-payout.ts";
import newContact from "../../triggers/new-contact.ts";
import newProposal from "../../triggers/new-proposal.ts";
import newAgreement from "../../triggers/new-agreement.ts";
import newProposalDraft from "../../triggers/new-proposal-draft.ts";
import newProposalTemplate from "../../triggers/new-proposal-template.ts";
import newServiceTemplate from "../../triggers/new-service-template.ts";

const B = "https://api.sayanchor.com";
const sub = { params: {}, subscriptionId: "s" };

interface Case {
  trigger: TriggerDefinition;
  key: string;
  url: string;
}

const cases: Case[] = [
  {
    trigger: newPayout as unknown as TriggerDefinition,
    key: "new-payout",
    url: `${B}/payouts?page=1&limit=100&sortField=depositDate&sortDirection=desc`,
  },
  {
    trigger: newContact as unknown as TriggerDefinition,
    key: "new-contact",
    url: `${B}/contacts?page=1&limit=100`,
  },
  {
    trigger: newProposal as unknown as TriggerDefinition,
    key: "new-proposal",
    url: `${B}/proposals?page=1&limit=100`,
  },
  {
    trigger: newAgreement as unknown as TriggerDefinition,
    key: "new-agreement",
    url: `${B}/v2/agreements?page=1&limit=100`,
  },
  {
    trigger: newProposalDraft as unknown as TriggerDefinition,
    key: "new-proposal-draft",
    url: `${B}/v2/proposal-drafts?page=1&limit=100`,
  },
  {
    trigger: newProposalTemplate as unknown as TriggerDefinition,
    key: "new-proposal-template",
    url: `${B}/proposal-templates?page=1&limit=100`,
  },
  {
    trigger: newServiceTemplate as unknown as TriggerDefinition,
    key: "new-service-template",
    url: `${B}/service-templates?page=1&limit=100`,
  },
];

const body = (...ids: string[]) => ({
  entries: ids.map((id) => ({ id })),
  page: 1,
  limit: 100,
  totalCount: ids.length,
});

for (const c of cases) {
  test(`${c.key}: seeds, emits only the new record, retries identically`, async () => {
    const seeded = await c.trigger.poll!(
      { ...sub, state: {} },
      mockCtx([{ body: body("b", "a") }]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    const run = () =>
      c.trigger.poll!(
        { ...sub, state: seeded.nextState },
        mockCtx([{ body: body("c", "b", "a") }]).ctx,
      );
    const first = await run();
    assertEquals(first.events, [{ id: "c" }]);
    assertEquals(await run(), first);
  });

  test(`${c.key}: the request is the literal list call`, async () => {
    const m = mockCtx([{ body: body("a") }]);
    await c.trigger.poll!({ ...sub, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(m.calls[0].url, c.url);
  });
}

test("snapshot triggers read every page (100 per page) before diffing", async () => {
  const full = Array.from({ length: 100 }, (_, i) => `p1-${i}`);
  const m = mockCtx([
    { body: { entries: full.map((id) => ({ id })), page: 1, limit: 100, totalCount: 101 } },
    { body: { entries: [{ id: "p2-0" }], page: 2, limit: 100, totalCount: 101 } },
  ]);
  await newContact.poll!({ ...sub, state: {} }, m.ctx);
  assertEquals(m.calls.map((c) => c.url), [
    `${B}/contacts?page=1&limit=100`,
    `${B}/contacts?page=2&limit=100`,
  ]);
});

test("a collection larger than 50 pages fails the check naming the limit", async () => {
  const full = {
    entries: Array.from({ length: 100 }, (_, i) => ({ id: `x${i}` })),
    totalCount: 99999,
  };
  const m = mockCtx(Array.from({ length: 50 }, () => ({ body: full })));
  let message = "";
  try {
    await newContact.poll!({ ...sub, state: {} }, m.ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("5000"), `unexpected message: ${message}`);
});
