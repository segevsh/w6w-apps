import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-review.ts";

// Newest-first feed (orderBy=createdat.desc): the trigger asks the wrapped action for the newest first.
const params = { businessUnitId: "bu1" };
const input = { params, subscriptionId: "sub-1" };
const item = (id: string) => ({ id: id });
const reply = (items: unknown[]) => ({ reviews: items });
const ctx = (items: unknown[]) => mockCtx([{ body: reply(items) }]);

test("new-review: seeds without emitting, then emits exactly the new item (idempotent)", async () => {
  const seed = ctx([item("r1")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const page = [item("r2"), item("r1")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("r2")]);
  assertEquals(retry, first);
});

test("new-review: requests the newest first with the wrapped action's endpoint", async () => {
  const m = ctx([item("r1")]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://api.trustpilot.com/v1/business-units/bu1/reviews?page=1&perPage=100&orderBy=createdat.desc",
  );
});
