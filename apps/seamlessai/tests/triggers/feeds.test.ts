import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { TriggerDefinition } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import newSavedSearch from "../../triggers/new-saved-search.ts";
import newCampaign from "../../triggers/new-campaign.ts";
import newActivity from "../../triggers/new-activity.ts";
import newOrUpdatedActivity from "../../triggers/new-or-updated-activity.ts";
import newList from "../../triggers/new-list.ts";
import newOrUpdatedList from "../../triggers/new-or-updated-list.ts";
import newTemplate from "../../triggers/new-template.ts";
import newCampaignContact from "../../triggers/new-campaign-contact.ts";

interface Req {
  method: string;
  path: string;
  query: Record<string, string>;
}
interface Case {
  name: string;
  trigger: TriggerDefinition;
  params: Record<string, unknown>;
  /** One response carrying `rows` (the vendor body for this endpoint). */
  respond(rows: unknown[]): MockResponse[];
  /** Existing row and the row that appears later. */
  old: Record<string, unknown>;
  fresh: Record<string, unknown>;
  /** The rows of the second check when the old row is replaced rather than joined. */
  replaces?: boolean;
  /** Literal requests of ONE check, in order. */
  requests: Req[];
}

const get = (path: string, query: Record<string, string> = {}): Req => ({
  method: "GET",
  path: `/api/client/v2${path}`,
  query,
});
const data = (rows: unknown[]): MockResponse[] => [{ body: { success: true, data: rows } }];

const cases: Case[] = [
  {
    name: "new-saved-search",
    trigger: newSavedSearch,
    params: {},
    respond: data,
    old: { savedSearchId: "1", name: "Old" },
    fresh: { savedSearchId: "2", name: "Fresh" },
    requests: [get("/saved-searches")],
  },
  {
    name: "new-saved-search (type filter)",
    trigger: newSavedSearch,
    params: { type: "contacts" },
    respond: data,
    old: { savedSearchId: "1" },
    fresh: { savedSearchId: "2" },
    requests: [get("/saved-searches", { type: "contacts" })],
  },
  {
    name: "new-campaign",
    trigger: newCampaign,
    params: {},
    respond: data,
    old: { campaignId: "10", name: "Old" },
    fresh: { campaignId: "11", name: "Fresh" },
    requests: [get("/campaigns", { limit: "50" })],
  },
  {
    name: "new-activity",
    trigger: newActivity,
    params: { campaignIdentifier: "q4-outbound" },
    respond: data,
    old: { activityId: "a1", occurredAt: "2026-11-10T08:00:00Z" },
    fresh: { activityId: "a2", occurredAt: "2026-11-10T09:00:00Z" },
    requests: [get("/activity", { campaignIdentifier: "q4-outbound", limit: "50", offset: "0" })],
  },
  {
    name: "new-activity (contactId filter)",
    trigger: newActivity,
    params: { contactId: 48213377 },
    respond: data,
    old: { activityId: "a1", occurredAt: "2026-11-10T08:00:00Z" },
    fresh: { activityId: "a2", occurredAt: "2026-11-10T09:00:00Z" },
    requests: [get("/activity", { contactId: "48213377", limit: "50", offset: "0" })],
  },
  {
    name: "new-or-updated-activity",
    trigger: newOrUpdatedActivity,
    params: {},
    respond: data,
    old: { activityId: "a1", occurredAt: "2026-11-10T08:00:00Z" },
    // The SAME thread with a newer event is a new event.
    fresh: { activityId: "a1", occurredAt: "2026-11-10T09:00:00Z" },
    requests: [get("/activity", { limit: "50", offset: "0" })],
  },
  {
    name: "new-list",
    trigger: newList,
    params: {},
    respond: data,
    old: { listId: "5", name: "Old" },
    fresh: { listId: "6", name: "Fresh" },
    requests: [get("/lists")],
  },
  {
    name: "new-or-updated-list",
    trigger: newOrUpdatedList,
    params: {},
    respond: data,
    old: { listId: "5", name: "Old", updatedAt: "2026-11-10T08:00:00Z" },
    fresh: { listId: "5", name: "Renamed", updatedAt: "2026-11-10T09:00:00Z" },
    replaces: true,
    requests: [get("/lists")],
  },
  {
    name: "new-template",
    trigger: newTemplate,
    params: {},
    respond: (
      rows,
    ) => [{ body: { success: true, data: rows, supplementalData: { hasMore: false } } }],
    old: { templateId: "t1", name: "Old" },
    fresh: { templateId: "t2", name: "Fresh" },
    requests: [get("/templates", { limit: "50", page: "1" })],
  },
  {
    name: "new-campaign-contact",
    trigger: newCampaignContact,
    params: { campaignId: "77" },
    respond: (rows) => [{ body: { success: true, data: rows, pagination: { hasMore: false } } }],
    old: { contactId: "c1", firstName: "Old" },
    fresh: { contactId: "c2", firstName: "Fresh" },
    requests: [get("/campaigns/77/contacts", { limit: "50", offset: "0" })],
  },
];

describe("seamlessai feed triggers", () => {
  for (const c of cases) {
    test(`${c.name}: seeds, emits the new row once, retries idempotently, sends the literal request`, async () => {
      const seeded = await c.trigger.poll!(
        { params: c.params, state: {} },
        mockCtx(c.respond([c.old])).ctx,
      );
      assert.deepEqual(seeded.events, []);
      assert.equal((seeded.nextState as { seeded?: boolean }).seeded, true);

      // Newest first for the list-shaped feeds; the snapshots accept any order.
      const rows = c.replaces ? [c.fresh] : [c.fresh, c.old];
      const run = mockCtx(c.respond(rows));
      const out = await c.trigger.poll!({ params: c.params, state: seeded.nextState }, run.ctx);
      assert.deepEqual(out.events, [c.fresh]);

      const again = await c.trigger.poll!(
        { params: c.params, state: seeded.nextState },
        mockCtx(c.respond(rows)).ctx,
      );
      assert.deepEqual(again, out);

      assert.deepEqual(
        run.calls.map((call) => {
          const url = new URL(call.url);
          return {
            method: call.method,
            path: url.pathname,
            query: Object.fromEntries(url.searchParams),
          };
        }),
        c.requests,
      );
    });
  }

  test("new-template reads every page until hasMore is false", async () => {
    const run = mockCtx([
      { body: { data: [{ templateId: "t1" }], supplementalData: { hasMore: true } } },
      { body: { data: [{ templateId: "t2" }], supplementalData: { hasMore: false } } },
    ]);
    const seeded = await newTemplate.poll!({ params: {}, state: {} }, run.ctx);
    assert.deepEqual(seeded.events, []);
    assert.deepEqual(
      run.calls.map((c) => new URL(c.url).search),
      ["?limit=50&page=1", "?limit=50&page=2"],
    );
    const next = await newTemplate.poll!(
      { params: {}, state: seeded.nextState },
      mockCtx([
        { body: { data: [{ templateId: "t1" }], supplementalData: { hasMore: true } } },
        {
          body: {
            data: [{ templateId: "t2" }, { templateId: "t3" }],
            supplementalData: { hasMore: false },
          },
        },
      ]).ctx,
    );
    assert.deepEqual(next.events, [{ templateId: "t3" }]);
  });

  test("new-campaign-contact pages by offset and refuses a missing campaign", async () => {
    const run = mockCtx([
      { body: { data: [{ contactId: "c1" }], pagination: { hasMore: true } } },
      { body: { data: [{ contactId: "c2" }], pagination: { hasMore: false } } },
    ]);
    await newCampaignContact.poll!({ params: { campaignId: "9" }, state: {} }, run.ctx);
    assert.deepEqual(
      run.calls.map((c) => new URL(c.url).pathname + new URL(c.url).search),
      [
        "/api/client/v2/campaigns/9/contacts?limit=50&offset=0",
        "/api/client/v2/campaigns/9/contacts?limit=50&offset=50",
      ],
    );
    await assert.rejects(
      newCampaignContact.poll!({ params: {}, state: {} }, mockCtx([]).ctx),
      /Campaign ID is required/,
    );
  });
});
