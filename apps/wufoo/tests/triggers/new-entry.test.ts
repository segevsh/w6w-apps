import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockWufooCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-entry.ts";

const params = { identifier: "form1" };
const entry1 = { EntryId: "1", DateCreated: "2026-11-09 10:00:00", Field1: "First" };
const entry2 = { EntryId: "2", DateCreated: "2026-11-09 11:00:00", Field1: "Second" };

test("new-entry: seeds without emitting existing entries", async () => {
  const { ctx } = mockWufooCtx([{ body: envelope("Entries", [entry1]) }]);
  const result = await trigger.poll!({ params, state: {} }, ctx);
  assertEquals(result.events, []);
  assertEquals(result.nextState.seeded, true);
});

test("new-entry: emits an entry that arrives after the seed", async () => {
  const { ctx } = mockWufooCtx([
    { body: envelope("Entries", [entry1]) },
    { body: envelope("Entries", [entry2, entry1]) },
  ]);
  const seed = await trigger.poll!({ params, state: {} }, ctx);
  const result = await trigger.poll!({ params, state: seed.nextState }, ctx);
  assertEquals(result.events, [entry2]);
});

test("new-entry: is idempotent for the same state and response", async () => {
  const state = { v: 1, kind: "ids", seeded: true, ids: [entry1.EntryId] };
  const a = mockWufooCtx([{ body: envelope("Entries", [entry2, entry1]) }]);
  const b = mockWufooCtx([{ body: envelope("Entries", [entry2, entry1]) }]);
  assertEquals(
    await trigger.poll!({ params, state }, a.ctx),
    await trigger.poll!({ params, state }, b.ctx),
  );
});

test("new-entry: calls entry list with literal EntryId descending sort", async () => {
  const { ctx, calls } = mockWufooCtx([{ body: envelope("Entries", []) }]);
  await trigger.poll!({ params, state: {} }, ctx);
  assertEquals(
    { method: calls[0].method, url: calls[0].url },
    {
      method: "GET",
      url:
        "https://fishbowl.wufoo.com/api/v3/forms/form1/entries.json?sort=EntryId&sortDirection=DESC&pageSize=100&system=true",
    },
  );
});
