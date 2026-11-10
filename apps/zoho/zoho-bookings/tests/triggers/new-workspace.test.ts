import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBookingsCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-workspace.ts";

test("new-workspace seeds, emits additions, retries, and calls the literal list endpoint", async () => {
  const response = (data: unknown[]) => ({
    body: { response: { status: "success", returnvalue: { data } } },
  });
  const seedCtx = mockBookingsCtx([response([{ id: "a" }])]);
  const seeded = await trigger.poll!({ params: {}, subscriptionId: "sub", state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(new URL(seedCtx.calls[0].url).pathname, "/bookings/v1/json/workspaces");
  const first = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: seeded.nextState },
    mockBookingsCtx([response([{ id: "b" }, { id: "a" }])]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: seeded.nextState },
    mockBookingsCtx([response([{ id: "b" }, { id: "a" }])]).ctx,
  );
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(retry, first);
});
