import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNationBuilderCtx } from "../_helpers.ts";
import newPerson from "../../triggers/new-person.ts";
import newOrUpdated from "../../triggers/new-or-updated-person.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: string, updated = "2026-11-09T10:00:00Z") => ({
  id,
  type: "signups",
  attributes: { email: `${id}@example.org`, updated_at: updated },
});
const ctx = (rows: unknown[]) => mockNationBuilderCtx([{ body: { data: rows, meta: {} } }]);

test("new-person: seeds, emits only new people, retries idempotently, requests newest first", async () => {
  const seed = ctx([row("1")]);
  const seeded = await newPerson.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://acme.nationbuilder.com/api/v2/signups?page%5Bsize%5D=100&page%5Bnumber%5D=1&sort=-created_at",
  );

  const page = [row("2"), row("1")];
  const first = await newPerson.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await newPerson.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [
    { id: "2", type: "signups", email: "2@example.org", updated_at: "2026-11-09T10:00:00Z" },
  ]);
  assertEquals(retry, first);
});

test("new-or-updated-person: an edited person is a new event; request sorts by update time", async () => {
  const seed = ctx([row("1")]);
  const seeded = await newOrUpdated.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://acme.nationbuilder.com/api/v2/signups?page%5Bsize%5D=100&page%5Bnumber%5D=1&sort=-updated_at",
  );

  const page = [row("1", "2026-11-09T12:00:00Z"), row("1")];
  const first = await newOrUpdated.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await newOrUpdated.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [
    { id: "1", type: "signups", email: "1@example.org", updated_at: "2026-11-09T12:00:00Z" },
  ]);
  assertEquals(retry, first);
});
