import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { executeKwArgs, mockCtx } from "../_helpers.ts";
import newContact from "../../triggers/new-contact.ts";
import newOrUpdated from "../../triggers/new-or-updated-contact.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: number, write = "2026-11-09 10:00:00") => ({
  id,
  name: `c${id}`,
  create_date: "2026-11-09 10:00:00",
  write_date: write,
});
const ctx = (rows: unknown[]) => mockCtx([{ result: rows }]);
const FIELDS = ["id", "name", "email", "phone", "is_company", "create_date", "write_date"];

test("new-contact: seeds, emits only new contacts, retries idempotently, orders by create_date desc", async () => {
  const seed = ctx([row(1)]);
  const seeded = await newContact.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(executeKwArgs(seed.calls[0]), {
    model: "res.partner",
    method: "search_read",
    args: [],
    kwargs: { domain: [], fields: FIELDS, limit: 100, offset: 0, order: "create_date desc" },
  });

  const page = [row(2), row(1)];
  const first = await newContact.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await newContact.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [row(2)]);
  assertEquals(retry, first);
});

test("new-or-updated-contact: an edited contact is a new event; orders by write_date desc", async () => {
  const seed = ctx([row(1)]);
  const seeded = await newOrUpdated.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(executeKwArgs(seed.calls[0]), {
    model: "res.partner",
    method: "search_read",
    args: [],
    kwargs: { domain: [], fields: FIELDS, limit: 100, offset: 0, order: "write_date desc" },
  });

  const page = [row(1, "2026-11-09 12:00:00"), row(1)];
  const first = await newOrUpdated.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await newOrUpdated.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [row(1, "2026-11-09 12:00:00")]);
  assertEquals(retry, first);
});
