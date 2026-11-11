import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/new-subscription.ts";

const input = (state: unknown) => ({ params: {}, state, subscriptionId: "s" });
const sub = (id: string) => ({
  id,
  entityType: "contact",
  entityId: "123456",
  signalTypes: ["promotion"],
  url: "https://example.com/webhook",
  isActive: true,
  createdAt: "2026-01-14T10:00:00.000Z",
});
// Newest first, as `GET /api/subscriptions` documents.
const page = (...ids: string[]) => ({
  body: {
    data: ids.map(sub),
    pagination: { total: ids.length, limit: 100, offset: 0, hasMore: false },
  },
});

test("new-subscription: wired, a poll with output and sample, no onSubscribe", () => {
  assert(app.triggers.some((t) => t === trigger));
  assertEquals(typeof trigger.poll, "function");
  assertEquals(trigger.onSubscribe, undefined);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(trigger.minIntervalMs, 300_000);
});

test("new-subscription: seeds without events, then emits only the new subscription, idempotently", async () => {
  const seeded = await trigger.poll!(input({}), mockCtx([page("s2", "s1")]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  const run = () => trigger.poll!(input(seeded.nextState), mockCtx([page("s3", "s2", "s1")]).ctx);
  const first = await run();
  assertEquals(first.events, [sub("s3")]);
  assertEquals(await run(), first);
});

test("new-subscription: the request is the list action's, newest 100 first page", async () => {
  const m = mockCtx([page("s1")]);
  await trigger.poll!(input({}), m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(m.calls[0].url, "https://api.lusha.com/api/subscriptions?limit=100&offset=0");
});

test("new-subscription: a page already seen emits nothing", async () => {
  const seeded = await trigger.poll!(input({}), mockCtx([page("s1")]).ctx);
  const again = await trigger.poll!(input(seeded.nextState), mockCtx([page("s1")]).ctx);
  assertEquals(again.events, []);
});
