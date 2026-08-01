import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-get.ts";

Deno.test("booking-get: GETs /bookings/{uid} with cal-api-version 2026-02-25", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { uid: "abc123" } } }]);
  const result = await action.execute({ bookingUid: "abc123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings/abc123");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["cal-api-version"], "2026-02-25");
  assertEquals(result, { data: { uid: "abc123" } });
});

Deno.test("booking-get: URL-encodes the booking UID", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ bookingUid: "a/b c" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings/a%2Fb%20c");
});
