import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newDocument from "../../triggers/new-document.ts";
import newOrUpdated from "../../triggers/new-or-updated-document.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
// Fixed clock: 2026-11-09T12:00:00Z = epoch 1794225600 s.
const at = (seconds: number) => {
  clock.now = () => seconds * 1000;
};

const input = { params: {}, subscriptionId: "sub-1" };
const card = (id: string, updated = "2026-11-09T10:00:00.000Z") => ({
  id,
  status: "success",
  updated_at: updated,
});
const ctx = (cards: unknown[]) =>
  mockCtx([{ body: { document_cards: cards, meta: { current_page: 1, total_pages: 1 } } }]);

test("new-document: seeds, emits only new documents, retries idempotently, filters updated_since", async () => {
  at(1794225600);
  const seed = ctx([card("a")]);
  const seeded = await newDocument.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.pdfmonkey.io/api/v1/document_cards?page%5Bnumber%5D=1&q%5Bupdated_since%5D=1794225480",
  );

  at(1794225900);
  const page = [card("b"), card("a")];
  const next = ctx(page);
  const first = await newDocument.poll!({ ...input, state: seeded.nextState }, next.ctx);
  const retry = await newDocument.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [card("b")]);
  assertEquals(
    next.calls[0].url,
    "https://api.pdfmonkey.io/api/v1/document_cards?page%5Bnumber%5D=1&q%5Bupdated_since%5D=1794225480",
  );
  assertEquals(retry, first);
});

test("new-or-updated-document: a changed document is a new event; same updated_since filter", async () => {
  at(1794225600);
  const seed = ctx([card("a")]);
  const seeded = await newOrUpdated.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.pdfmonkey.io/api/v1/document_cards?page%5Bnumber%5D=1&q%5Bupdated_since%5D=1794225480",
  );

  at(1794225900);
  const page = [card("a", "2026-11-09T12:01:00.000Z"), card("a")];
  const first = await newOrUpdated.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await newOrUpdated.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [card("a", "2026-11-09T12:01:00.000Z")]);
  assertEquals(retry, first);
});

test("new-document: an old document with a fresh updated_at is not emitted; a new one is", async () => {
  at(1794225600);
  const seeded = await newDocument.poll!({ ...input, state: {} }, ctx([card("a")]).ctx);

  at(1794225900); // window starts 1794225780 = 2026-11-09T12:03:00Z
  const old = {
    ...card("old", "2026-11-09T12:04:00.000Z"),
    created_at: "2026-11-01T10:00:00.000Z",
  };
  const fresh = {
    ...card("fresh", "2026-11-09T12:04:30.000Z"),
    created_at: "2026-11-09T12:04:00.000Z",
  };
  const first = await newDocument.poll!(
    { ...input, state: seeded.nextState },
    ctx([fresh, old]).ctx,
  );
  assertEquals(first.events, [fresh]);
  const updated = await newOrUpdated.poll!(
    { ...input, state: seeded.nextState },
    ctx([fresh, old]).ctx,
  );
  assertEquals(updated.events, [old, fresh]);
});
