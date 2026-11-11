import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, okEnvelope } from "../_helpers.ts";
import newAudience from "../../triggers/new-audience.ts";
import newCampaign from "../../triggers/new-campaign.ts";
import newContact from "../../triggers/new-contact.ts";
import newEmailTemplate from "../../triggers/new-email-template.ts";
import newGoal from "../../triggers/new-goal.ts";
import newSocialChannel from "../../triggers/new-social-channel.ts";
import type { TriggerDefinition } from "@w6w/types";

const BASE = "https://api.vbout.com/1";
const rec = (id: string) => ({ id, name: `Item ${id}` });

interface Case {
  name: string;
  trigger: TriggerDefinition;
  params: Record<string, unknown>;
  /** Literal URLs of the requests one check makes, in order. */
  urls: string[];
  /** Responses for one check holding exactly the given ids. */
  respond(ids: string[]): Array<{ body: unknown }>;
  /** The record a given id becomes in `events`. */
  event(id: string): unknown;
}

const flat = (key: string) => (ids: string[]) => [
  { body: okEnvelope({ [key]: { count: ids.length, items: ids.map(rec) } }) },
];

const cases: Case[] = [
  {
    name: "new-audience",
    trigger: newAudience,
    params: {},
    urls: [`${BASE}/emailmarketing/getaudiences.json`],
    respond: flat("audiences"),
    event: rec,
  },
  {
    name: "new-email-template",
    trigger: newEmailTemplate,
    params: {},
    urls: [`${BASE}/emailmarketing/getemailtemplates.json`],
    respond: flat("templates"),
    event: rec,
  },
  {
    name: "new-goal",
    trigger: newGoal,
    params: {},
    urls: [`${BASE}/goal/lists.json`],
    respond: flat("goals"),
    event: rec,
  },
  {
    name: "new-contact",
    trigger: newContact,
    params: { listId: "148" },
    urls: [`${BASE}/emailmarketing/getcontacts.json?listid=148`],
    respond: flat("contacts"),
    event: rec,
  },
  {
    name: "new-social-channel",
    trigger: newSocialChannel,
    params: {},
    urls: [`${BASE}/socialmedia/channels.json`],
    respond: (ids) => [{
      body: okEnvelope({
        channels: {
          Facebook: { count: ids.length, pages: ids.map(rec) },
          Twitter: { count: 0, profiles: [] },
        },
      }),
    }],
    event: (id) => ({ network: "Facebook", id, name: `Item ${id}` }),
  },
  {
    name: "new-campaign",
    trigger: newCampaign,
    params: {},
    urls: [
      `${BASE}/emailmarketing/campaigns.json?filter=all&limit=100&page=1`,
      `${BASE}/emailmarketing/campaigns.json?filter=all&limit=100&page=2`,
    ],
    // page 1 holds the ids (split across two state buckets); page 2 repeats nothing new.
    respond: (ids) => [
      {
        body: okEnvelope({
          campaigns: {
            count: ids.length,
            items: {
              Draft: { data: ids.slice(0, 1).map(rec) },
              Sent: { data: ids.slice(1).map(rec) },
            },
          },
        }),
      },
      { body: okEnvelope({ campaigns: { count: 0, items: {} } }) },
    ],
    event: rec,
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const poll = async (state: unknown, ids: string[]) => {
      const m = mockCtx(c.respond(ids));
      const r = await c.trigger.poll!({ params: c.params, state, subscriptionId: "s" }, m.ctx);
      return { r, calls: m.calls };
    };

    test("seeds without events, then emits only the new record, idempotently", async () => {
      const seeded = await poll({}, ["a", "b"]);
      assertEquals(seeded.r.events, []);
      assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
      const first = await poll(seeded.r.nextState, ["a", "b", "c"]);
      const retry = await poll(seeded.r.nextState, ["a", "b", "c"]);
      assertEquals(first.r.events, [c.event("c")]);
      assertEquals(retry.r, first.r);
    });

    test("an edited or removed record is not an event", async () => {
      const seeded = await poll({}, ["a", "b"]);
      const next = await poll(seeded.r.nextState, ["a"]);
      assertEquals(next.r.events, []);
    });

    test("sends the literal request of the wrapped list action", async () => {
      const { calls } = await poll({}, ["a", "b"]);
      assertEquals(calls.map((x) => x.method), c.urls.map(() => "GET"));
      assertEquals(calls.map((x) => x.url.replace(/[?&]key=[^&]*/, "")), c.urls);
      assertEquals(calls.map((x) => x.body), c.urls.map(() => null));
    });

    test("declares output, sample and a poll", () => {
      assertEquals(c.trigger.output!.length > 0, true);
      assertEquals(c.trigger.sample !== undefined, true);
      assertEquals(typeof c.trigger.poll, "function");
    });
  });
}

test("new-campaign: keeps paging while a page adds new ids", async () => {
  const m = mockCtx([
    { body: okEnvelope({ campaigns: { count: 2, items: { Sent: { data: [rec("1")] } } } }) },
    { body: okEnvelope({ campaigns: { count: 2, items: { Sent: { data: [rec("2")] } } } }) },
    { body: okEnvelope({ campaigns: { count: 2, items: { Sent: { data: [rec("2")] } } } }) },
  ]);
  const r = await newCampaign.poll!({ params: {}, state: {}, subscriptionId: "s" }, m.ctx);
  assertEquals(m.calls.length, 3);
  assertEquals(r.events, []);
  const m2 = mockCtx([
    {
      body: okEnvelope({
        campaigns: { count: 3, items: { Sent: { data: [rec("1"), rec("3")] } } },
      }),
    },
    { body: okEnvelope({ campaigns: { count: 3, items: { Sent: { data: [rec("2")] } } } }) },
    { body: okEnvelope({ campaigns: { count: 3, items: {} } }) },
  ]);
  const next = await newCampaign.poll!(
    { params: {}, state: r.nextState, subscriptionId: "s" },
    m2.ctx,
  );
  assertEquals(next.events, [rec("3")]);
});
