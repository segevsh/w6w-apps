import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-credential.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const wrap = (items: unknown[]) => ({ data: items, pagination: {} });
const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: wrap(items) }]);
const item = (
  id: string,
) => ({ id, createdAt: "2026-11-09T09:00:00.000Z", updatedAt: "2026-11-09T09:00:00.000Z" });

test("new-or-updated-credential: seeds without emitting, emits only the new item, retries idempotently", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

test("new-or-updated-credential: sends the list action's request with the newest-first argument", async () => {
  const seed = ctx([item("a")]);
  await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(seed.calls[0].url, "https://api.certifier.io/v1/credentials/search");
  assertEquals(JSON.parse(seed.calls[0].body ?? "null"), {
    sort: { property: "updatedAt", order: "desc" },
    limit: 100,
  });
});

test("new-or-updated-credential: an edited record is a new event; an unchanged one is not", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  const edited = { ...item("a"), updatedAt: "2026-11-09T10:00:00.000Z" };
  const out = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([edited, item("b")]).ctx,
  );
  assertEquals(out.events.length, 2);
  const again = await trigger.poll!(
    { ...input, state: out.nextState },
    ctx([edited, item("b")]).ctx,
  );
  assertEquals(again.events, []);
});
