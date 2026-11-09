import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-subscriber.ts";

const first = { id: 1, email_address: "first@example.com" };
const second = { id: 2, email_address: "second@example.com" };

test("new-subscriber seeds, emits unseen subscribers, and is retry-idempotent", async () => {
  const seededMock = mockCtx([{ body: { subscribers: [first] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {} }, seededMock.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seededMock.calls[0].url,
    "https://api.kit.com/v4/subscribers?per_page=100&sort_field=updated_at&sort_order=desc",
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
  assertEquals(firstRun.events, [second]);
  assertEquals(retry, firstRun);
});
