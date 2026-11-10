import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-envelope.ts";
import { clock } from "../../lib/triggers.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const respond = (items: unknown[]) => ({ body: { envelopes: items } });
const item = (envelopeId: string, statusChangedDateTime = "2026-11-09T10:00:00Z") => ({
  envelopeId,
  statusChangedDateTime,
});
const ctx = (items: unknown[]) => mockCtx([respond(items)]);
clock.now = () => Date.parse("2026-11-09T12:00:00Z");

test("new-or-updated-envelope: seeds without flooding and sends the documented request", async () => {
  const seed = ctx([item("e1")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://na4.docusign.net/restapi/v2.1/accounts/acc-1/envelopes?from_date=2026-10-10T12%3A00%3A00.000Z&order_by=status_changed&order=desc&count=100&start_position=0",
  );
});

test("new-or-updated-envelope: emits only the new item", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("e1")]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item("e2"), item("e1")]).ctx,
  );
  assertEquals(result.events, [item("e2")]);
});

test("new-or-updated-envelope: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("e1")]).ctx);
  const page = [item("e2"), item("e1")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

test("new-or-updated-envelope: an edited record is a new event, an untouched one is not", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    ctx([item("e1", "2026-11-09T10:00:00Z")]).ctx,
  );
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item("e1", "2026-11-09T13:00:00Z")]).ctx,
  );
  assertEquals(edited.events, [item("e1", "2026-11-09T13:00:00Z")]);
  const same = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item("e1", "2026-11-09T10:00:00Z")]).ctx,
  );
  assertEquals(same.events, []);
});
