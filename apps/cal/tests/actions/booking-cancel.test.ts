import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-cancel.ts";

Deno.test("booking-cancel: POSTs /bookings/{uid}/cancel with cal-api-version 2026-02-25", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { uid: "abc", status: "cancelled" } } }]);
  const result = await action.execute({ bookingUid: "abc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings/abc/cancel");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["cal-api-version"], "2026-02-25");
  assertEquals(result, { data: { uid: "abc", status: "cancelled" } });
});

Deno.test("booking-cancel: forwards cancellationReason and cancelSubsequentBookings", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute(
    { bookingUid: "abc", cancellationReason: "conflict", cancelSubsequentBookings: true },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.cancellationReason, "conflict");
  assertEquals(body.cancelSubsequentBookings, true);
});

Deno.test("booking-cancel: URL-encodes the booking UID", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ bookingUid: "a b" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings/a%20b/cancel");
});

Deno.test("booking-cancel: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
