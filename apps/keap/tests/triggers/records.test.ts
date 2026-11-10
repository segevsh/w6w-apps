import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import newCampaign from "../../triggers/new-campaign.ts";
import newCampaignSequence from "../../triggers/new-campaign-sequence.ts";
import newCompany from "../../triggers/new-company.ts";
import newEmail from "../../triggers/new-email.ts";
import newOpportunity from "../../triggers/new-opportunity.ts";
import newOrUpdatedOpportunity from "../../triggers/new-or-updated-opportunity.ts";
import newOrder from "../../triggers/new-order.ts";
import newOrUpdatedOrder from "../../triggers/new-or-updated-order.ts";
import newOrUpdatedProduct from "../../triggers/new-or-updated-product.ts";
import newOrUpdatedSubscription from "../../triggers/new-or-updated-subscription.ts";
import newTag from "../../triggers/new-tag.ts";
import newOrUpdatedTag from "../../triggers/new-or-updated-tag.ts";
import newTaggedContact from "../../triggers/new-tagged-contact.ts";
import newTask from "../../triggers/new-task.ts";
import newOrUpdatedTask from "../../triggers/new-or-updated-task.ts";
import newUser from "../../triggers/new-user.ts";

// Round 3 poll triggers over Keap v2 list actions, table-driven. Every trigger gets the brief 5
// cases (seed / one new item / idempotent retry / LITERAL request incl. the order_by argument);
// the new-or-updated ones also get the brief 9.2 edited-record case. The URLs below are written out
// by hand from the Keap v2 OpenAPI document (page_size max 1000, order_by per resource).
const BASE = "https://api.infusionsoft.com/crm/rest/v2";
const run = (t: TriggerDefinition, state: unknown, body: unknown, params: unknown = {}) => {
  const m = mockCtx([{ body }]);
  return t.poll!({ params, state, subscriptionId: "sub" } as never, m.ctx).then((r) => ({
    ...r,
    calls: m.calls,
  }));
};

interface Feed {
  name: string;
  trigger: TriggerDefinition;
  list: string;
  url: string;
  params?: Record<string, unknown>;
  /** Edit stamp field for a new-or-updated trigger. */
  stamp?: string;
}

const FEEDS: Feed[] = [
  {
    name: "new-campaign",
    trigger: newCampaign,
    list: "campaigns",
    url: `${BASE}/campaigns?order_by=datecreated%20desc&page_size=100`,
  },
  {
    name: "new-company",
    trigger: newCompany,
    list: "companies",
    url: `${BASE}/companies?order_by=create_time%20desc&page_size=100`,
  },
  {
    name: "new-email",
    trigger: newEmail,
    list: "emails",
    url: `${BASE}/emails?order_by=created_time%20desc&page_size=100`,
  },
  {
    name: "new-opportunity",
    trigger: newOpportunity,
    list: "opportunities",
    url: `${BASE}/opportunities?order_by=created_time%20desc&page_size=100`,
  },
  {
    name: "new-or-updated-opportunity",
    trigger: newOrUpdatedOpportunity,
    list: "opportunities",
    url: `${BASE}/opportunities?order_by=update_time%20desc&page_size=100`,
    stamp: "last_updated_time",
  },
  {
    name: "new-order",
    trigger: newOrder,
    list: "orders",
    url: `${BASE}/orders?order_by=order_time%20desc&page_size=100`,
  },
  {
    name: "new-or-updated-order",
    trigger: newOrUpdatedOrder,
    list: "orders",
    url: `${BASE}/orders?order_by=modification_time%20desc&page_size=100`,
    stamp: "modification_time",
  },
  {
    name: "new-or-updated-product",
    trigger: newOrUpdatedProduct,
    list: "products",
    url: `${BASE}/products?order_by=last_updated_time%20desc&page_size=100`,
    stamp: "update_time",
  },
  {
    name: "new-or-updated-subscription",
    trigger: newOrUpdatedSubscription,
    list: "subscriptions",
    url: `${BASE}/subscriptions?order_by=modification_time%20desc&page_size=100`,
    stamp: "modification_time",
  },
  {
    name: "new-tag",
    trigger: newTag,
    list: "tags",
    url: `${BASE}/tags?order_by=create_time%20desc&page_size=100`,
  },
  {
    name: "new-or-updated-tag",
    trigger: newOrUpdatedTag,
    list: "tags",
    url: `${BASE}/tags?order_by=update_time%20desc&page_size=100`,
    stamp: "update_time",
  },
  {
    name: "new-task",
    trigger: newTask,
    list: "tasks",
    url: `${BASE}/tasks?order_by=create_time%20desc&page_size=100`,
  },
  {
    name: "new-or-updated-task",
    trigger: newOrUpdatedTask,
    list: "tasks",
    url: `${BASE}/tasks?order_by=update_time%20desc&page_size=100`,
    stamp: "modification_time",
  },
  {
    name: "new-user",
    trigger: newUser,
    list: "users",
    url: `${BASE}/users?order_by=create_time%20desc&page_size=100`,
  },
  {
    name: "new-tagged-contact",
    trigger: newTaggedContact,
    list: "contacts",
    params: { tagId: "tag-7" },
    url: `${BASE}/tags/tag-7/contacts?order_by=applied_time%20desc&page_size=100`,
    stamp: "applied_time",
  },
];

for (const f of FEEDS) {
  const params = f.params ?? {};
  // A record carries its edit stamp when the trigger is new-or-updated.
  const rec = (id: string, v = "s1") => (f.stamp ? { id, [f.stamp]: v } : { id });
  const page = (...items: unknown[]) => ({ [f.list]: items });

  test(`${f.name}: seed emits nothing, a new record fires once, retry is idempotent`, async () => {
    const seeded = await run(f.trigger, {}, page(rec("2"), rec("1")), params);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const body = page(rec("3"), rec("2"), rec("1"));
    const a = await run(f.trigger, seeded.nextState, body, params);
    const b = await run(f.trigger, seeded.nextState, body, params);
    assertEquals(a.events, [rec("3")]);
    assertEquals({ ...a, calls: 0 }, { ...b, calls: 0 });
    const again = await run(f.trigger, a.nextState, body, params);
    assertEquals(again.events, []);
  });

  test(`${f.name}: sends the literal newest-first list request`, async () => {
    const r = await run(f.trigger, {}, page(rec("1")), params);
    assertEquals(r.calls.length, 1);
    assertEquals(r.calls[0].method, "GET");
    assertEquals(r.calls[0].url, f.url);
  });

  if (f.stamp) {
    test(`${f.name}: an edited record is a new event, an untouched one is not (9.2)`, async () => {
      const seeded = await run(f.trigger, {}, page(rec("1", "s1")), params);
      const edited = await run(f.trigger, seeded.nextState, page(rec("1", "s2")), params);
      assertEquals(edited.events, [rec("1", "s2")]);
      const untouched = await run(f.trigger, seeded.nextState, page(rec("1", "s1")), params);
      assertEquals(untouched.events, []);
    });
  }
}

test("new-campaign-sequence: seed, one added sequence, idempotent retry, literal request", async () => {
  const params = { campaignId: "camp-4" };
  const seq = (id: string) => ({ id, name: `Sequence ${id}` });
  const seeded = await run(newCampaignSequence, {}, { sequences: [seq("1")] }, params);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(seeded.calls[0].url, `${BASE}/campaigns/camp-4/sequences`);
  const body = { sequences: [seq("1"), seq("2")] };
  const a = await run(newCampaignSequence, seeded.nextState, body, params);
  const b = await run(newCampaignSequence, seeded.nextState, body, params);
  assertEquals(a.events, [seq("2")]);
  assertEquals({ ...a, calls: 0 }, { ...b, calls: 0 });
});

test("new-campaign-sequence: a truncated read fails loudly instead of emitting a partial diff", async () => {
  const m = mockCtx([{ body: { sequences: [{ id: "1" }], next_page_token: "more" } }]);
  let error = "";
  try {
    await newCampaignSequence.poll!(
      { params: { campaignId: "c" }, state: {}, subscriptionId: "sub" } as never,
      m.ctx,
    );
  } catch (e) {
    error = (e as Error).message;
  }
  assertEquals(
    error,
    "new-campaign-sequence: more than one page of records; a snapshot cannot be taken",
  );
});

test("every new trigger declares output, sample and a poll floor, and no onSubscribe", () => {
  for (const t of [...FEEDS.map((f) => f.trigger), newCampaignSequence]) {
    assertEquals(t.poll !== undefined && t.onSubscribe === undefined, true, t.key);
    assertEquals((t.output ?? []).length > 0, true, t.key);
    assertEquals(t.sample !== undefined, true, t.key);
    assertEquals((t.minIntervalMs ?? 0) >= 60_000, true, t.key);
  }
});
