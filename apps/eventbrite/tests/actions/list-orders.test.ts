import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-orders.ts";

const DEFAULT_EXPAND =
  "attendees,ticket_buyer_settings,contact_list_preferences,answers,survey_responses,survey,refund_requests";

test("list-orders: scope=event routes to /events/{id}/orders/", async () => {
  const body = { orders: [], pagination: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!({ scope: "event", scopeId: "evt-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/events/evt-1/orders/");
  assertEquals(url.searchParams.get("page_size"), null); // Eventbrite rejects page_size here; never sent, even from legacy saved input
  assertEquals(url.searchParams.get("expand"), DEFAULT_EXPAND);
});

test("list-orders: scope=organization routes to /organizations/{id}/orders/", async () => {
  const { ctx, calls } = mockCtx([{ body: { orders: [], pagination: {} } }]);
  await action.execute!(
    {
      scope: "organization",
      scopeId: "acct-1",
      status: "placed",
      changedSince: "2026-01-01T00:00:00Z",
      onlyEmails: "a@x.com,b@x.com",
      excludeEmails: "c@x.com",
      pageSize: 10,
      continuation: "c1",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/organizations/acct-1/orders/");
  const p = url.searchParams;
  assertEquals(p.get("status"), "placed");
  assertEquals(p.get("changed_since"), "2026-01-01T00:00:00Z");
  assertEquals(p.get("only_emails"), "a@x.com,b@x.com");
  assertEquals(p.get("exclude_emails"), "c@x.com");
  assertEquals(p.get("page_size"), null); // Eventbrite rejects page_size here; never sent, even from legacy saved input
  assertEquals(p.get("continuation"), "c1");
});

test("list-orders: scope=user routes to /users/{id}/orders/", async () => {
  const { ctx, calls } = mockCtx([{ body: { orders: [], pagination: {} } }]);
  await action.execute!(
    { scope: "user", scopeId: "u-1", timeFilter: "past", changedSince: "2026-01-01T00:00:00Z" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/users/u-1/orders/");
  assertEquals(url.searchParams.get("time_filter"), "past");
  assertEquals(url.searchParams.get("changed_since"), "2026-01-01T00:00:00Z");
});

test("list-orders: organization 'All orders' sends all_not_deleted (the org endpoint refuses `both`)", async () => {
  const { ctx, calls } = mockCtx([{ body: { orders: [], pagination: {} } }]);
  await action.execute!({ scope: "organization", scopeId: "158502474690", status: "both" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("status"), "all_not_deleted");
});

test("list-orders: event scope keeps `both` (that endpoint accepts it)", async () => {
  const { ctx, calls } = mockCtx([{ body: { orders: [], pagination: {} } }]);
  await action.execute!({ scope: "event", scopeId: "evt-1", status: "both" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("status"), "both");
});

test("list-orders: changed_since is rewritten to YYYY-MM-DDThh:mm:ssZ", async () => {
  for (
    const [given, sent] of [
      ["2026-11-17T10:20:30.123Z", "2026-11-17T10:20:30Z"],
      ["2026-11-17T12:20:30+02:00", "2026-11-17T10:20:30Z"],
      ["2026-11-17", "2026-11-17T00:00:00Z"],
      ["1763374830000", "2025-11-17T10:20:30Z"],
    ]
  ) {
    const { ctx, calls } = mockCtx([{ body: { orders: [], pagination: {} } }]);
    await action.execute!({ scope: "organization", scopeId: "o", changedSince: given }, ctx);
    assertEquals(new URL(calls[0].url).searchParams.get("changed_since"), sent, given);
  }
});

test("list-orders: a blank changed_since is not sent; a non-date is refused before any call", async () => {
  const { ctx, calls } = mockCtx([{ body: { orders: [], pagination: {} } }]);
  await action.execute!({ scope: "event", scopeId: "e", changedSince: "  " }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("changed_since"), null);

  const bad = mockCtx([{ body: { orders: [], pagination: {} } }]);
  let message = "";
  try {
    await action.execute!({ scope: "event", scopeId: "e", changedSince: "last tuesday" }, bad.ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.startsWith("Changed since:"), true);
  assertEquals(bad.calls.length, 0);
});
