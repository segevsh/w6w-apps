import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newDocument from "../../triggers/new-document.ts";
import newOrUpdated from "../../triggers/new-or-updated-document.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: string, modified = "2026-11-09T10:00:00Z") => ({
  id,
  name: id,
  date_created: "2026-11-09T10:00:00Z",
  date_modified: modified,
});
const ctx = (rows: unknown[]) => mockCtx([{ body: { results: rows } }]);

test("new-document: seeds, emits only new documents, retries idempotently, orders by -date_created", async () => {
  const seed = ctx([row("a")]);
  const seeded = await newDocument.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.pandadoc.com/public/v1/documents?order_by=-date_created&count=100&page=1",
  );

  const page = [row("b"), row("a")];
  const first = await newDocument.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await newDocument.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [row("b")]);
  assertEquals(retry, first);
});

test("new-or-updated-document: an edited document is a new event; orders by -date_modified", async () => {
  const seed = ctx([row("a")]);
  const seeded = await newOrUpdated.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.pandadoc.com/public/v1/documents?order_by=-date_modified&count=100&page=1",
  );

  const page = [row("a", "2026-11-09T12:00:00Z"), row("a")];
  const first = await newOrUpdated.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await newOrUpdated.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [row("a", "2026-11-09T12:00:00Z")]);
  assertEquals(retry, first);
});
