import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-outbound-message.ts";

const first = { MessageID: "m1", ReceivedAt: "2026-11-09T12:00:00Z" };
const second = { MessageID: "m2", ReceivedAt: "2026-11-09T12:01:00Z" };

test("new-outbound-message seeds without emitting messages", async () => {
  const seededMock = mockCtx([{ body: { Messages: [first] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {} }, seededMock.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-outbound-message emits one unseen message", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: { Messages: [first] } }]).ctx,
  );
  const result = await trigger.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([{ body: { Messages: [second, first] } }]).ctx,
  );
  assertEquals(result.events, [second]);
});

test("new-outbound-message is retry-idempotent", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: { Messages: [first] } }]).ctx,
  );

  const response = { body: { Messages: [second, first] } };
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

test("new-outbound-message requests the newest-first list endpoint", async () => {
  const seededMock = mockCtx([{ body: { Messages: [first] } }]);
  await trigger.poll!({ params: {}, state: {} }, seededMock.ctx);
  assertEquals(
    seededMock.calls[0].url,
    "https://api.postmarkapp.com/messages/outbound?count=100&offset=0",
  );
});
