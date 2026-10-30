import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/cancel-reservation.ts";

test("cancel-reservation: PUTs the documented cancelledBy body", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 117243, status: "cancelled" })]);
  await action.execute({ reservationId: 117243, cancelledBy: "guest" }, ctx);

  assertEquals(
    calls[0].url,
    "https://api.hostaway.com/v1/reservations/117243/statuses/cancelled",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { cancelledBy: "guest" });
});

test("cancel-reservation: accepts host, refuses anything else before sending", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 1 })]);
  await action.execute({ reservationId: 1, cancelledBy: "host" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { cancelledBy: "host" });

  await assertRejects(
    () => Promise.resolve(action.execute({ reservationId: 1, cancelledBy: "channel" }, ctx)),
    Error,
    'must be "host" or "guest"',
  );
  assertEquals(calls.length, 1);
});
