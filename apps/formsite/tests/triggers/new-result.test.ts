import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFormsiteCtx as mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-result.ts";

const params = { formDir: "fs-contact" };
const input = { params, subscriptionId: "sub-1" };
const item = (
  id: number,
  updated = "2026-11-09T10:00:00Z",
) => ({ id: String(id), result_status: "Complete", date_update: updated });
const body = (items: unknown[]) => ({ results: items });
const ctx = (items: unknown[]) => mockCtx([{ body: body(items) }]);

test("new-result: seed check emits nothing and records the cursor/ids", async () => {
  const c = ctx([item(1)]);
  const r = await trigger.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(r.events, []);
  assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
});

const seed = () => trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);

test("new-result: emits only the record that is new", async () => {
  const state = (await seed()).nextState;
  const r = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(r.events, [item(2)]);
});

test("new-result: the same state and responses give the same result", async () => {
  const state = (await seed()).nextState;
  const a = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  const b = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(a, b);
});

test("new-result: requests exactly the endpoint the list action calls", async () => {
  const state = (await seed()).nextState;
  const c = ctx([item(1)]);
  await trigger.poll!({ ...input, state }, c.ctx);
  assertEquals(c.calls.length, 1);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://fs3.formsite.com/api/v2/acme/forms/fs-contact/results?limit=100&page=1&sort_direction=desc",
  );
});
