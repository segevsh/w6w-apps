import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import newCampaign from "../../triggers/new-campaign.ts";
import newCommunity from "../../triggers/new-community.ts";
import newCourse from "../../triggers/new-course.ts";
import newEnrollment from "../../triggers/new-enrollment.ts";
import newFunnel from "../../triggers/new-funnel.ts";
import newMembership from "../../triggers/new-membership.ts";
import newNewsletter from "../../triggers/new-newsletter.ts";
import newTag from "../../triggers/new-tag.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (items: unknown[]) => mockCtx([{ body: { items, hasMore: false } }]);
const item = (id: number) => ({ id });

const cases: Array<{ key: string; trigger: TriggerDefinition; url: string }> = [
  {
    key: "new-campaign",
    trigger: newCampaign,
    url: "https://api.systeme.io/api/mailing/campaigns?limit=100&order=desc",
  },
  {
    key: "new-community",
    trigger: newCommunity,
    url: "https://api.systeme.io/api/community/communities?limit=100&order=desc",
  },
  {
    key: "new-course",
    trigger: newCourse,
    url: "https://api.systeme.io/api/school/courses?limit=100&order=desc",
  },
  {
    key: "new-enrollment",
    trigger: newEnrollment,
    url: "https://api.systeme.io/api/school/enrollments?limit=100&order=desc",
  },
  {
    key: "new-funnel",
    trigger: newFunnel,
    url: "https://api.systeme.io/api/funnels?limit=100&order=desc",
  },
  {
    key: "new-membership",
    trigger: newMembership,
    url: "https://api.systeme.io/api/community/memberships?limit=100&order=desc",
  },
  {
    key: "new-newsletter",
    trigger: newNewsletter,
    url: "https://api.systeme.io/api/mailing/newsletters?limit=100&order=desc",
  },
  {
    key: "new-tag",
    trigger: newTag,
    url: "https://api.systeme.io/api/tags?limit=100&order=desc",
  },
];

for (const c of cases) {
  test(`${c.key}: the first check seeds without emitting`, async () => {
    const seeded = await c.trigger.poll!({ ...input, state: {} }, ctx([item(2), item(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  });

  test(`${c.key}: a new record is emitted once and a retry repeats it identically`, async () => {
    const seeded = await c.trigger.poll!({ ...input, state: {} }, ctx([item(2), item(1)]).ctx);
    const page = [item(3), item(2), item(1)];
    const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await c.trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item(3)]);
    assertEquals(retry, first);
  });

  test(`${c.key}: requests the literal list endpoint with order=desc`, async () => {
    const m = ctx([item(1)]);
    await c.trigger.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals({ method: m.calls[0].method, url: m.calls[0].url }, { method: "GET", url: c.url });
  });
}
