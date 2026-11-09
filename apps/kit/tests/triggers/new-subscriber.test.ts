import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-subscriber.ts";

const first = { id: 1, email_address: "first@example.com" };
const second = { id: 2, email_address: "second@example.com" };

test("new-subscriber seeds without emitting subscribers", async () => {
  const seededMock = mockCtx([{ body: { subscribers: [first] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {} }, seededMock.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-subscriber emits one unseen subscriber", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: { subscribers: [first] } }]).ctx,
  );
  const result = await trigger.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([{ body: { subscribers: [second, first] } }]).ctx,
  );
  assertEquals(result.events, [second]);
});

test("new-subscriber is retry-idempotent", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: { subscribers: [first] } }]).ctx,
  );

  const response = { body: { subscribers: [second, first] } };
  const firstRun = await trigger.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([response]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([response]).ctx,
  );
  assertEquals(retry, firstRun);
});

test("new-subscriber requests the newest-first list endpoint", async () => {
  const seededMock = mockCtx([{ body: { subscribers: [first] } }]);
  await trigger.poll!({ params: {}, state: {} }, seededMock.ctx);
  assertEquals(
    seededMock.calls[0].url,
    "https://api.kit.com/v4/subscribers?per_page=100&sort_field=updated_at&sort_order=desc",
  );
});
