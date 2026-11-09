import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-outbound-message.ts";

const first = { MessageID: "m1", ReceivedAt: "2026-11-09T12:00:00Z" };
const second = { MessageID: "m2", ReceivedAt: "2026-11-09T12:01:00Z" };

test("new-outbound-message seeds, emits unseen messages, and is retry-idempotent", async () => {
  const seededMock = mockCtx([{ body: { Messages: [first] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {} }, seededMock.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seededMock.calls[0].url,
    "https://api.postmarkapp.com/messages/outbound?count=100&offset=0",
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
  assertEquals(firstRun.events, [second]);
  assertEquals(retry, firstRun);
});
