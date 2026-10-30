import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import attendees from "../../actions/list-attendees.ts";
import orders from "../../actions/list-orders.ts";
import tickets from "../../actions/list-ticket-classes.ts";
import events from "../../actions/list-events.ts";
import organizers from "../../actions/list-organizers.ts";

// The vendor's endpoint-specific request parameters are distinct from the
// pagination response's page_size field. Keep saved pageSize inputs harmless.
// Reference: https://www.eventbrite.com/platform/new/api
for (const scope of ["event", "organization"] as const) {
  test(`attendees: ${scope} ignores saved pageSize and preserves pagination`, async () => {
    const { ctx, calls } = mockCtx([{ body: { attendees: [] } }]);
    await attendees.execute!({ scope, scopeId: "a/b", pageSize: 25, continuation: "next" }, ctx);
    const url = new URL(calls[0].url);
    assertEquals(
      url.pathname,
      `/v3/${scope === "event" ? "events" : "organizations"}/a%2Fb/attendees/`,
    );
    assertEquals(Object.fromEntries(url.searchParams), { continuation: "next" });
  });
}

test("attendees: unpaid is rejected for organization scope before making a request", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(
    () => attendees.execute!({ scope: "organization", scopeId: "1", status: "unpaid" }, ctx),
    Error,
    "Event scope",
  );
  assertEquals(calls.length, 0);
});

test("attendees: event scope still supports unpaid", async () => {
  const { ctx, calls } = mockCtx([{ body: { attendees: [] } }]);
  await attendees.execute!({ scope: "event", scopeId: "1", status: "unpaid" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("status"), "unpaid");
});

for (const scope of ["event", "organization", "user"] as const) {
  test(`orders: ${scope} sends only supported filters from a saved configuration`, async () => {
    const { ctx, calls } = mockCtx([{ body: { orders: [] } }]);
    await orders.execute!({
      scope,
      scopeId: "1",
      pageSize: 50,
      status: "active",
      onlyEmails: "one@example.com",
      excludeEmails: "two@example.com",
      changedSince: "2026-01-01T00:00:00Z",
      timeFilter: "past",
      continuation: "next",
      expand: "event",
    }, ctx);
    assertEquals(Object.fromEntries(new URL(calls[0].url).searchParams), {
      changed_since: "2026-01-01T00:00:00Z",
      continuation: "next",
      expand: "event",
      ...(scope === "user"
        ? { time_filter: "past" }
        : { status: "active", only_emails: "one@example.com", exclude_emails: "two@example.com" }),
    });
  });
}

for (const forSale of [false, true]) {
  test(`ticket classes: forSale=${forSale} ignores saved pageSize`, async () => {
    const { ctx, calls } = mockCtx([{ body: { ticket_classes: [] } }]);
    await tickets.execute!({ eventId: "a/b", forSale, pageSize: 100, continuation: "next" }, ctx);
    const url = new URL(calls[0].url);
    assertEquals(url.pathname, `/v3/events/a%2Fb/ticket_classes/${forSale ? "for_sale/" : ""}`);
    assertEquals(Object.fromEntries(url.searchParams), { continuation: "next" });
  });
}

for (const scope of ["organization", "venue", "series"] as const) {
  test(`events: ${scope} only sends page_size for organizations`, async () => {
    const { ctx, calls } = mockCtx([{ body: { events: [] } }]);
    await events.execute!({ scope, scopeId: "1", pageSize: 25, continuation: "next" }, ctx);
    const query = new URL(calls[0].url).searchParams;
    assertEquals(query.get("page_size"), scope === "organization" ? "25" : null);
    assertEquals(query.get("continuation"), "next");
  });
}

test("events: a blank Scope ID falls back to Organization ID", async () => {
  const { ctx, calls } = mockCtx([{ body: { events: [] } }]);
  await events.execute!({ scopeId: "", organizationId: "123" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/organizations/123/events/");
});

for (const scope of ["venue", "series"] as const) {
  test(`events: ${scope} cannot reuse Organization ID or sort by name`, () => {
    const { ctx, calls } = mockCtx();
    assertThrows(() => events.execute!({ scope, organizationId: "123" }, ctx), Error, "scopeId");
    assertThrows(
      () => events.execute!({ scope, scopeId: "123", orderBy: "name_asc" }, ctx),
      Error,
      "Organization scope",
    );
    assertEquals(calls.length, 0);
  });
}

test("organizers: organization IDs cannot change the request path", async () => {
  const { ctx, calls } = mockCtx([{ body: { organizers: [] } }]);
  await organizers.execute!({ organizationId: "a/b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/organizations/a%2Fb/organizers/");
});

test("unsupported page size inputs are no longer offered in the editor", () => {
  for (const action of [attendees, orders, tickets]) {
    assert(action.params);
    assert(!action.params.some((p) => p.key === "pageSize"));
  }
});
