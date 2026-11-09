import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

const first = { ID: 1, UUID: "m1", ArrivedAt: "2026-11-09T12:00:00Z" };
const second = { ID: 2, UUID: "m2", ArrivedAt: "2026-11-09T12:01:00Z" };

test("new-message seeds, emits unseen messages, and is retry-idempotent", async () => {
  const seededMock = mockCtx([{ body: { Data: [first] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {} }, seededMock.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seededMock.calls[0].url,
    "https://api.mailjet.com/v3/REST/message?Limit=100&Sort=ArrivedAt+DESC",
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
  assertEquals(firstRun.events, [second]);
  assertEquals(retry, firstRun);
});
