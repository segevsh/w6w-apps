import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

const first = { ID: 1, UUID: "m1", ArrivedAt: "2026-11-09T12:00:00Z" };
const second = { ID: 2, UUID: "m2", ArrivedAt: "2026-11-09T12:01:00Z" };

test("new-message seeds without emitting messages", async () => {
  const seededMock = mockCtx([{ body: { Data: [first] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {} }, seededMock.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-message emits one unseen message", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: { Data: [first] } }]).ctx,
  );
  const result = await trigger.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([{ body: { Data: [second, first] } }]).ctx,
  );
  assertEquals(result.events, [second]);
});

test("new-message is retry-idempotent", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: { Data: [first] } }]).ctx,
  );

  const response = { body: { Data: [second, first] } };
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

test("new-message requests the newest-first list endpoint", async () => {
  const seededMock = mockCtx([{ body: { Data: [first] } }]);
  await trigger.poll!({ params: {}, state: {} }, seededMock.ctx);
  assertEquals(
    seededMock.calls[0].url,
    "https://api.mailjet.com/v3/REST/message?Limit=100&Sort=ArrivedAt+DESC",
  );
});
