import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockTeamworkCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-project.ts";

// Newest-first feed (orderBy=datecreated, orderMode=desc): the trigger asks the wrapped action for the newest first.
const params = {};
const input = { params, subscriptionId: "sub-1" };
const item = (id: number) => ({ id: id });
const reply = (items: unknown[]) => ({ projects: items });
const ctx = (items: unknown[]) => mockTeamworkCtx([{ body: reply(items) }]);

test("new-project: seeds without emitting, then emits exactly the new item (idempotent)", async () => {
  const seed = ctx([item(1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const page = [item(2), item(1)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item(2)]);
  assertEquals(retry, first);
});

test("new-project: requests the newest first with the wrapped action's endpoint", async () => {
  const m = ctx([item(1)]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://acme.teamwork.com/projects/api/v3/projects.json?orderBy=datecreated&orderMode=desc&page=1&pageSize=100",
  );
});
