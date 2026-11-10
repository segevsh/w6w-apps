import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { API_ROOT, APP_ID, mockCtxWithConnection } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

const message = (id: string) => ({ id, name: `m-${id}`, queued_at: 1762732800 });
const poll = (state: unknown, notifications: unknown[]) => {
  const mock = mockCtxWithConnection([{
    body: { total_count: notifications.length, notifications },
  }]);
  return { mock, result: trigger.poll!({ params: {}, state, subscriptionId: "sub-1" }, mock.ctx) };
};

test("new-message: first check seeds without emitting", async () => {
  const seed = poll({}, [message("m2"), message("m1")]);
  const out = await seed.result;
  assertEquals(out.events, []);
  assertEquals((out.nextState as { seeded?: boolean }).seeded, true);
});

test("new-message: emits only the new message after seeding", async () => {
  const seeded = await poll({}, [message("m1")]).result;
  const next = await poll(seeded.nextState, [message("m2"), message("m1")]).result;
  assertEquals(next.events, [message("m2")]);
});

test("new-message: retrying the same state and page is idempotent", async () => {
  const seeded = await poll({}, [message("m1")]).result;
  const a = await poll(seeded.nextState, [message("m2"), message("m1")]).result;
  const b = await poll(seeded.nextState, [message("m2"), message("m1")]).result;
  assertEquals(b, a);
});

test("new-message: requests the view-messages endpoint, limit 50, offset 0", async () => {
  const seed = poll({}, [message("m1")]);
  await seed.result;
  const call = seed.mock.calls[0];
  assertEquals(call.method, "GET");
  assertEquals(
    call.url,
    `${API_ROOT}/notifications?app_id=${APP_ID}&limit=50&offset=0`,
  );
});
