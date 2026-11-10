import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-document.ts";

// Newest-first feed by a user-supplied sort_by (Typesense has no built-in creation order).
const D = { display: { host: "https://search.internal:8108" } };
const params = { collection: "products", queryBy: "name", sortBy: "created_at:desc" };
const input = { params, subscriptionId: "sub-1" };
const doc = (id: string) => ({ id, name: "boot" });
const reply = (docs: unknown[]) => ({
  status: 200,
  body: { found: docs.length, out_of: docs.length, hits: docs.map((document) => ({ document })) },
});
const ctx = (docs: unknown[]) => mockCtx([reply(docs)], D);

test("new-document: seeds without emitting, then emits exactly the new item (idempotent)", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([doc("1")]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const page = [doc("2"), doc("1")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [doc("2")]);
  assertEquals(retry, first);
});

test("new-document: requests q=* with the user's newest-first sort", async () => {
  const m = ctx([doc("1")]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    decodeURIComponent(m.calls[0].url),
    "https://search.internal:8108/collections/products/documents/search?q=*&query_by=name&" +
      "sort_by=created_at:desc&per_page=100&page=1&num_typos=0&drop_tokens_threshold=0&" +
      "typo_tokens_threshold=0",
  );
});

test("new-document: refuses to run without a sort", async () => {
  const err = await assertRejects(
    () => trigger.poll!({ ...input, params: { ...params, sortBy: " " }, state: {} }, ctx([]).ctx),
  );
  assert(String(err).includes("sortBy"));
});
