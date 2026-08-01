import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-get-many.ts";

Deno.test("booking-get-many: GETs /bookings with cal-api-version 2026-05-01", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], pagination: { hasMore: false } } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["cal-api-version"], "2026-05-01");
});

Deno.test("booking-get-many: maps every filter to its query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute(
    {
      status: "upcoming",
      attendeeEmail: "a@b.com",
      attendeeName: "Alice",
      eventTypeId: 42,
      afterStart: "2026-08-01T00:00:00Z",
      beforeEnd: "2026-08-02T00:00:00Z",
      limit: 10,
      cursor: "next",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("status"), "upcoming");
  assertEquals(url.searchParams.get("attendeeEmail"), "a@b.com");
  assertEquals(url.searchParams.get("attendeeName"), "Alice");
  assertEquals(url.searchParams.get("eventTypeId"), "42");
  assertEquals(url.searchParams.get("afterStart"), "2026-08-01T00:00:00Z");
  assertEquals(url.searchParams.get("beforeEnd"), "2026-08-02T00:00:00Z");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("cursor"), "next");
});

Deno.test("booking-get-many: omits unset optional filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
});
