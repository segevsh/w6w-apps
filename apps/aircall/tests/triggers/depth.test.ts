import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newContact from "../../triggers/new-contact.ts";
import newOrUpdatedContact from "../../triggers/new-or-updated-contact.ts";
import newUser from "../../triggers/new-user.ts";
import newNumber from "../../triggers/new-number.ts";
import newTeam from "../../triggers/new-team.ts";
import newUserNumber from "../../triggers/new-user-number.ts";
import type { TriggerDefinition } from "@w6w/types";

const meta = { total: 2, next_page_link: null };
const sub = { subscriptionId: "s" };

interface Case {
  name: string;
  trigger: TriggerDefinition;
  params: Record<string, unknown>;
  field: string;
  url: string;
  known: unknown[];
  fresh: unknown;
}

const cases: Case[] = [
  {
    name: "new-contact",
    trigger: newContact as unknown as TriggerDefinition,
    params: {},
    field: "contacts",
    url: "https://api.aircall.io/v1/contacts?order=desc&page=1&per_page=50",
    known: [{ id: 2, updated_at: 5 }, { id: 1, updated_at: 4 }],
    fresh: { id: 3, updated_at: 6 },
  },
  {
    name: "new-or-updated-contact",
    trigger: newOrUpdatedContact as unknown as TriggerDefinition,
    params: {},
    field: "contacts",
    url: "https://api.aircall.io/v1/contacts?order=desc&page=1&per_page=50&order_by=updated_at",
    known: [{ id: 2, updated_at: 5 }, { id: 1, updated_at: 4 }],
    fresh: { id: 1, updated_at: 9 },
  },
  {
    name: "new-user",
    trigger: newUser as unknown as TriggerDefinition,
    params: {},
    field: "users",
    url: "https://api.aircall.io/v2/users?order=desc&page=1&per_page=50",
    known: [{ id: 20 }, { id: 10 }],
    fresh: { id: 30 },
  },
  {
    name: "new-number",
    trigger: newNumber as unknown as TriggerDefinition,
    params: {},
    field: "numbers",
    url: "https://api.aircall.io/v1/numbers?order=desc&page=1&per_page=50",
    known: [{ id: 200 }, { id: 100 }],
    fresh: { id: 300 },
  },
  {
    name: "new-team",
    trigger: newTeam as unknown as TriggerDefinition,
    params: {},
    field: "teams",
    url: "https://api.aircall.io/v1/teams?page=1&per_page=50&order=desc",
    known: [{ id: 22 }, { id: 11 }],
    fresh: { id: 33 },
  },
  {
    name: "new-user-number",
    trigger: newUserNumber as unknown as TriggerDefinition,
    params: { userId: "456" },
    field: "numbers",
    url: "https://api.aircall.io/v2/users/456/numbers?page=1&per_page=50",
    known: [{ id: 200 }, { id: 100 }],
    fresh: { id: 300 },
  },
];

for (const c of cases) {
  const input = { params: c.params, ...sub };
  const page = (rows: unknown[]) => mockCtx([{ body: { meta, [c.field]: rows } }]);

  test(`${c.name}: seeds without events, emits only the new record, retries identically`, async () => {
    const seed = page(c.known);
    const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    const rows = [c.fresh, ...c.known];
    const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, page(rows).ctx);
    const retry = await c.trigger.poll!({ ...input, state: seeded.nextState }, page(rows).ctx);
    assertEquals(first.events, [c.fresh]);
    assertEquals(retry, first);
  });

  test(`${c.name}: the request is the literal list call`, async () => {
    const seed = page(c.known);
    await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
  });
}

test("new-or-updated-contact: an edited contact (new updated_at) is a new event, an unchanged one is not", async () => {
  const page = (rows: unknown[]) => mockCtx([{ body: { meta, contacts: rows } }]);
  const seeded = await newOrUpdatedContact.poll!(
    { params: {}, ...sub, state: {} },
    page([{ id: 1, updated_at: 4 }]).ctx,
  );
  const same = await newOrUpdatedContact.poll!(
    { params: {}, ...sub, state: seeded.nextState },
    page([{ id: 1, updated_at: 4 }]).ctx,
  );
  assertEquals(same.events, []);
  const edited = await newOrUpdatedContact.poll!(
    { params: {}, ...sub, state: seeded.nextState },
    page([{ id: 1, updated_at: 8 }]).ctx,
  );
  assertEquals(edited.events, [{ id: 1, updated_at: 8 }]);
});

test("new-user-number: a removed number is not an event and a re-check stays quiet", async () => {
  const page = (rows: unknown[]) => mockCtx([{ body: { meta, numbers: rows } }]);
  const input = { params: { userId: "456" }, ...sub };
  const seeded = await newUserNumber.poll!(
    { ...input, state: {} },
    page([{ id: 1 }, { id: 2 }]).ctx,
  );
  const after = await newUserNumber.poll!(
    { ...input, state: seeded.nextState },
    page([{ id: 1 }]).ctx,
  );
  assertEquals(after.events, []);
});
