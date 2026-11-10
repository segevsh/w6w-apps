import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import { MAX_PAGES } from "../../lib/polls.ts";
import newTicketGroup from "../../triggers/new-ticket-group.ts";
import newInventoryTier from "../../triggers/new-inventory-tier.ts";
import newSeatMap from "../../triggers/new-seat-map.ts";
import newEventTeam from "../../triggers/new-event-team.ts";
import newDiscount from "../../triggers/new-discount.ts";
import newCustomQuestion from "../../triggers/new-custom-question.ts";
import newDefaultQuestion from "../../triggers/new-default-question.ts";
import newOrganizationMember from "../../triggers/new-organization-member.ts";
import newOrganizer from "../../triggers/new-organizer.ts";
import newVenue from "../../triggers/new-venue.ts";

// Round-3 snapshot triggers (brief 10.6): each case asserts a LITERAL request, never a value the
// code under test computed. `list` is the response field, `url` the first request, `page2` the
// request after a `continuation` of "tok1" (absent when the endpoint cannot be paged).
const API = "https://www.eventbriteapi.com/v3";
const input = (params: Record<string, unknown>, state: unknown) => ({
  params,
  state,
  subscriptionId: "sub_1",
});

interface Row {
  trigger: TriggerDefinition;
  params: Record<string, unknown>;
  list: string;
  url: string;
  page2?: string;
}

const ROWS: Row[] = [
  {
    trigger: newTicketGroup,
    params: { organizationId: "org-1" },
    list: "ticket_groups",
    url: `${API}/organizations/org-1/ticket_groups/?status=live`,
    page2: `${API}/organizations/org-1/ticket_groups/?status=live&continuation=tok1`,
  },
  {
    trigger: newInventoryTier,
    params: { eventId: "evt-1" },
    list: "inventory_tiers",
    url: `${API}/events/evt-1/inventory_tiers/`,
  },
  {
    trigger: newSeatMap,
    params: { organizationId: "org-1" },
    list: "seatmaps",
    url: `${API}/organizations/org-1/seatmaps/`,
  },
  {
    trigger: newEventTeam,
    params: { eventId: "evt-1" },
    list: "teams",
    url: `${API}/events/evt-1/teams/`,
    page2: `${API}/events/evt-1/teams/?continuation=tok1`,
  },
  {
    trigger: newDiscount,
    params: { organizationId: "org-1", scope: "event", eventId: "evt-1" },
    list: "discounts",
    url: `${API}/organizations/org-1/discounts/?scope=event&event_id=evt-1`,
    page2: `${API}/organizations/org-1/discounts/?scope=event&event_id=evt-1&continuation=tok1`,
  },
  {
    trigger: newCustomQuestion,
    params: { eventId: "evt-1" },
    list: "questions",
    url: `${API}/events/evt-1/questions/`,
    page2: `${API}/events/evt-1/questions/?continuation=tok1`,
  },
  {
    trigger: newDefaultQuestion,
    params: { eventId: "evt-1" },
    list: "questions",
    url: `${API}/events/evt-1/canned_questions/?include_all=false`,
    page2: `${API}/events/evt-1/canned_questions/?include_all=false&continuation=tok1`,
  },
  {
    trigger: newOrganizationMember,
    params: { organizationId: "org-1" },
    list: "members",
    url: `${API}/organizations/org-1/members/`,
    page2: `${API}/organizations/org-1/members/?continuation=tok1`,
  },
  {
    trigger: newOrganizer,
    params: { organizationId: "org-1" },
    list: "organizers",
    url: `${API}/organizations/org-1/organizers/`,
  },
  {
    trigger: newVenue,
    params: { organizationId: "org-1" },
    list: "venues",
    url: `${API}/organizations/org-1/venues/`,
    page2: `${API}/organizations/org-1/venues/?continuation=tok1`,
  },
];

const body = (list: string, ids: string[], more?: string): MockResponse => ({
  body: {
    [list]: ids.map((id) => ({ id, name: `record ${id}` })),
    pagination: more ? { has_more_items: true, continuation: more } : { has_more_items: false },
  },
});

for (const row of ROWS) {
  describe(row.trigger.key, () => {
    test("declares a poll, output and sample, and no subscribe hook", () => {
      assertEquals(typeof row.trigger.poll, "function");
      assertEquals(row.trigger.onSubscribe, undefined);
      assertEquals((row.trigger.output ?? []).length > 0, true);
      assertEquals(row.trigger.sample !== undefined, true);
      assertEquals(row.trigger.minIntervalMs, 300_000);
    });

    test("seed: empty state emits nothing and records the list", async () => {
      const m = mockCtx([body(row.list, ["r1", "r2"])]);
      const out = await row.trigger.poll!(input(row.params, {}), m.ctx);
      assertEquals(out.events, []);
      assertEquals((out.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(m.calls.length, 1);
      assertEquals(m.calls[0].method, "GET");
      assertEquals(m.calls[0].url, row.url);
    });

    test("a record added after the seed is emitted once, and nothing else", async () => {
      const seeded = await row.trigger.poll!(
        input(row.params, {}),
        mockCtx([body(row.list, ["r1", "r2"])]).ctx,
      );
      const next = await row.trigger.poll!(
        input(row.params, seeded.nextState),
        mockCtx([body(row.list, ["r1", "r2", "r3"])]).ctx,
      );
      assertEquals(next.events, [{ id: "r3", name: "record r3" }]);
      const again = await row.trigger.poll!(
        input(row.params, next.nextState),
        mockCtx([body(row.list, ["r1", "r2", "r3"])]).ctx,
      );
      assertEquals(again.events, []);
    });

    test("the same state and responses give the same result (idempotent retry)", async () => {
      const seeded = await row.trigger.poll!(
        input(row.params, {}),
        mockCtx([body(row.list, ["r1"])]).ctx,
      );
      const run = () =>
        row.trigger.poll!(
          input(row.params, seeded.nextState),
          mockCtx([body(row.list, ["r1", "r9"])]).ctx,
        );
      assertEquals(await run(), await run());
    });

    if (row.page2) {
      test("follows the continuation token and reads every page", async () => {
        const m = mockCtx([body(row.list, ["r1"], "tok1"), body(row.list, ["r2"])]);
        const out = await row.trigger.poll!(input(row.params, {}), m.ctx);
        assertEquals(out.events, []);
        assertEquals(m.calls.map((c) => c.url), [row.url, row.page2]);
        // Both pages were recorded: the next check emits only the genuinely new record.
        const next = await row.trigger.poll!(
          input(row.params, out.nextState),
          mockCtx([body(row.list, ["r1"], "tok1"), body(row.list, ["r2", "r3"])]).ctx,
        );
        assertEquals(next.events, [{ id: "r3", name: "record r3" }]);
      });

      test(`refuses a list longer than ${MAX_PAGES} pages instead of comparing half of it`, async () => {
        const pages = Array.from(
          { length: MAX_PAGES },
          (_, i) => body(row.list, [`p${i}`], `tok${i + 2}`),
        );
        const m = mockCtx(pages);
        await assertRejects(
          () => row.trigger.poll!(input(row.params, {}), m.ctx),
          Error,
          "too long to compare",
        );
        assertEquals(m.calls.length, MAX_PAGES);
      });
    } else {
      test("refuses a response that says it has more but cannot be paged", async () => {
        const m = mockCtx([body(row.list, ["r1"], "tok1")]);
        await assertRejects(
          () => row.trigger.poll!(input(row.params, {}), m.ctx),
          Error,
          "cannot be compared",
        );
        assertEquals(m.calls.length, 1);
      });
    }
  });
}

describe("new-discount scope", () => {
  test("the account-wide scope sends no event id", async () => {
    const m = mockCtx([body("discounts", ["d1"])]);
    await newDiscount.poll!(input({ organizationId: "org-1", scope: "user" }, {}), m.ctx);
    assertEquals(m.calls[0].url, `${API}/organizations/org-1/discounts/?scope=user`);
  });

  test("the one-event scope without an event id is refused before any request", async () => {
    const m = mockCtx([]);
    await assertRejects(
      () => newDiscount.poll!(input({ organizationId: "org-1", scope: "event" }, {}), m.ctx),
      Error,
      "Set Event ID",
    );
    assertEquals(m.calls.length, 0);
  });
});

test("the app lists exactly the eleven round-3 poll triggers beside its sixteen webhook triggers", async () => {
  const { default: app } = await import("../../index.ts");
  const polls = app.triggers.filter((t) => typeof t.poll === "function").map((t) => t.key).sort();
  assertEquals(polls, [
    "new-custom-question",
    "new-default-question",
    "new-discount",
    "new-event-team",
    "new-inventory-tier",
    "new-or-updated-attendee",
    "new-organization-member",
    "new-organizer",
    "new-seat-map",
    "new-ticket-group",
    "new-venue",
  ]);
  assertEquals(app.triggers.length, 27);
});
