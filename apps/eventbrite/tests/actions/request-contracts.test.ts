import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import attendees from "../../actions/list-attendees.ts";
import orders from "../../actions/list-orders.ts";
import tickets from "../../actions/list-ticket-classes.ts";
import events from "../../actions/list-events.ts";
import organizers from "../../actions/list-organizers.ts";
import organizations from "../../actions/list-organizations.ts";
import subcategories from "../../actions/list-subcategories.ts";
import venues from "../../actions/list-venues.ts";
import customQuestions from "../../actions/list-custom-questions.ts";
import defaultQuestions from "../../actions/list-default-questions.ts";
import inventoryTiers from "../../actions/list-inventory-tiers.ts";
import discounts from "../../actions/search-discounts.ts";
import { MAX_PAGE_SIZE } from "../../lib/paging.ts";

// Which of `page` and `page_size` each list endpoint ACCEPTS was measured against the live API
// (2026-11-19; README §Pagination): an unaccepted one is a 400 ARGUMENTS_ERROR, so each action
// sends only what its endpoint takes, and a saved value for the other is dropped.
for (const scope of ["event", "organization"] as const) {
  test(`attendees: ${scope} sends page, and page_size only for an event`, async () => {
    const { ctx, calls } = mockCtx([{ body: { attendees: [] } }]);
    await attendees.execute!(
      { scope, scopeId: "a/b", pageSize: 25, page: 3, continuation: "next" },
      ctx,
    );
    const url = new URL(calls[0].url);
    assertEquals(
      url.pathname,
      `/v3/${scope === "event" ? "events" : "organizations"}/a%2Fb/attendees/`,
    );
    assertEquals(Object.fromEntries(url.searchParams), {
      ...(scope === "event" ? { page_size: "25" } : {}),
      page: "3",
      continuation: "next",
    });
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
  test(`orders: ${scope} sends only supported filters and paging from a saved configuration`, async () => {
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
      page: 2,
      continuation: "next",
      expand: "event",
    }, ctx);
    assertEquals(Object.fromEntries(new URL(calls[0].url).searchParams), {
      changed_since: "2026-01-01T00:00:00Z",
      page: "2",
      continuation: "next",
      expand: "event",
      ...(scope === "user" ? { time_filter: "past" } : {
        status: "active",
        only_emails: "one@example.com",
        exclude_emails: "two@example.com",
        page_size: "50",
      }),
    });
  });
}

for (const forSale of [false, true]) {
  test(`ticket classes: forSale=${forSale} sends page and ignores saved pageSize`, async () => {
    const { ctx, calls } = mockCtx([{ body: { ticket_classes: [] } }]);
    await tickets.execute!(
      { eventId: "a/b", forSale, pageSize: 100, page: 2, continuation: "next" },
      ctx,
    );
    const url = new URL(calls[0].url);
    assertEquals(url.pathname, `/v3/events/a%2Fb/ticket_classes/${forSale ? "for_sale/" : ""}`);
    assertEquals(Object.fromEntries(url.searchParams), { page: "2", continuation: "next" });
  });
}

for (const scope of ["organization", "venue", "series"] as const) {
  test(`events: ${scope} sends page, and page_size except for a venue`, async () => {
    const { ctx, calls } = mockCtx([{ body: { events: [] } }]);
    await events.execute!(
      { scope, scopeId: "1", pageSize: 25, page: 2, continuation: "next" },
      ctx,
    );
    const query = new URL(calls[0].url).searchParams;
    assertEquals(query.get("page_size"), scope === "venue" ? null : "25");
    assertEquals(query.get("page"), "2");
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

const paramOf = (action: { params?: { key: string }[] }, key: string) =>
  action.params?.find((p) => p.key === key) as Record<string, unknown> | undefined;

test("editor offers Page size only where Eventbrite accepts page_size, scoped to those scopes", () => {
  for (const action of [orders, attendees, events, subcategories, discounts]) {
    const p = paramOf(action, "pageSize");
    assert(p, `${action.key} offers Page size`);
    assertEquals((p.validation as Record<string, unknown>).max, MAX_PAGE_SIZE);
  }
  assertEquals(paramOf(orders, "pageSize")!.showIf, { field: "scope", notIn: ["user"] });
  assertEquals(paramOf(attendees, "pageSize")!.showIf, { field: "scope", equals: "event" });
  assertEquals(paramOf(events, "pageSize")!.showIf, {
    field: "scope",
    in: ["organization", "series"],
  });
  for (
    const action of [
      tickets,
      organizers,
      organizations,
      venues,
      customQuestions,
      defaultQuestions,
      inventoryTiers,
    ]
  ) {
    assert(!paramOf(action, "pageSize"), `${action.key} must not offer Page size`);
  }
});

test("editor offers Page on every list Eventbrite pages by number", () => {
  for (
    const action of [
      orders,
      attendees,
      events,
      tickets,
      organizers,
      organizations,
      subcategories,
      venues,
      customQuestions,
      defaultQuestions,
      inventoryTiers,
      discounts,
    ]
  ) {
    assert(paramOf(action, "page"), `${action.key} offers Page`);
  }
});

test("page size is clamped to Eventbrite's 200 maximum and blank values are omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { orders: [] } }, { body: { orders: [] } }]);
  await orders.execute!({ scope: "event", scopeId: "1", pageSize: 500, page: 0 }, ctx);
  await orders.execute!(
    { scope: "event", scopeId: "1", pageSize: "" as never, page: "" as never },
    ctx,
  );
  const first = new URL(calls[0].url).searchParams;
  assertEquals(first.get("page_size"), "200");
  assertEquals(first.get("page"), null);
  const second = new URL(calls[1].url).searchParams;
  assertEquals(second.get("page_size"), null);
  assertEquals(second.get("page"), null);
});

for (
  const [name, run, path] of [
    [
      "venues",
      (c: never) => venues.execute!({ organizationId: "o1", page: 2 }, c),
      "/v3/organizations/o1/venues/",
    ],
    [
      "custom questions",
      (c: never) => customQuestions.execute!({ eventId: "e1", page: 2 }, c),
      "/v3/events/e1/questions/",
    ],
    [
      "default questions",
      (c: never) => defaultQuestions.execute!({ eventId: "e1", page: 2 }, c),
      "/v3/events/e1/canned_questions/",
    ],
    [
      "inventory tiers",
      (c: never) => inventoryTiers.execute!({ eventId: "e1", page: 2 }, c),
      "/v3/events/e1/inventory_tiers/",
    ],
    [
      "organizations",
      (c: never) => organizations.execute!({ page: 2 }, c),
      "/v3/users/me/organizations/",
    ],
  ] as const
) {
  test(`${name}: sends page`, async () => {
    const { ctx, calls } = mockCtx([{ body: {} }]);
    await run(ctx as never);
    const url = new URL(calls[0].url);
    assertEquals(url.pathname, path);
    assertEquals(url.searchParams.get("page"), "2");
    assertEquals(url.searchParams.get("page_size"), null);
  });
}
