import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import newCampaign from "../../triggers/new-campaign.ts";
import newOrUpdatedCampaign from "../../triggers/new-or-updated-campaign.ts";
import newGroup from "../../triggers/new-group.ts";
import newOrUpdatedGroup from "../../triggers/new-or-updated-group.ts";
import newSegment from "../../triggers/new-segment.ts";
import newOrUpdatedSegment from "../../triggers/new-or-updated-segment.ts";
import newGroupSubscriber from "../../triggers/new-group-subscriber.ts";
import newSegmentSubscriber from "../../triggers/new-segment-subscriber.ts";

// `path` and `order` are LITERALS (never computed by the code under test).
const feeds = [
  {
    name: "new-campaign",
    trigger: newCampaign,
    params: {},
    path: "/v2/campaigns",
    order: "created",
    stamped: false,
  },
  {
    name: "new-or-updated-campaign",
    trigger: newOrUpdatedCampaign,
    params: {},
    path: "/v2/campaigns",
    order: "modified",
    stamped: true,
  },
  {
    name: "new-group",
    trigger: newGroup,
    params: {},
    path: "/v2/groups",
    order: "created",
    stamped: false,
  },
  {
    name: "new-or-updated-group",
    trigger: newOrUpdatedGroup,
    params: {},
    path: "/v2/groups",
    order: "modified",
    stamped: true,
  },
  {
    name: "new-segment",
    trigger: newSegment,
    params: {},
    path: "/v2/segments/",
    order: "created",
    stamped: false,
  },
  {
    name: "new-or-updated-segment",
    trigger: newOrUpdatedSegment,
    params: {},
    path: "/v2/segments/",
    order: "modified",
    stamped: true,
  },
  {
    name: "new-group-subscriber",
    trigger: newGroupSubscriber,
    params: { groupId: "grp1" },
    path: "/v2/groups/grp1/subscribers",
    order: "created",
    stamped: false,
  },
  {
    name: "new-segment-subscriber",
    trigger: newSegmentSubscriber,
    params: { segmentId: "seg1" },
    path: "/v2/segments/seg1/subscribers",
    order: "created",
    stamped: false,
  },
];

const rec = (id: string, modified: string) => ({ id, modified });

for (const f of feeds) {
  test(`${f.name} seeds, emits only the new record, retries identically, requests ${f.order} desc`, async () => {
    const call = async (state: unknown, items: unknown[]) => {
      const m = mockCtx([{ body: listEnvelope(items) }]);
      const r = await f.trigger.poll!({ params: f.params, state, subscriptionId: "s" }, m.ctx);
      const url = new URL(m.calls[0].url);
      return {
        r,
        req: {
          method: m.calls[0].method,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams),
        },
      };
    };
    const expectedReq = {
      method: "GET",
      path: f.path,
      query: { page: "1", limit: "100", order: f.order, direction: "desc" },
    };
    const seed = await call({}, [rec("a", "2026-11-10 09:00:00")]);
    assertEquals(seed.r.events, []);
    assertEquals((seed.r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.req, expectedReq);

    const fresh = rec("b", "2026-11-10 09:05:00");
    const page = [fresh, rec("a", "2026-11-10 09:00:00")];
    const first = await call(seed.r.nextState, page);
    const retry = await call(seed.r.nextState, page);
    assertEquals(first.r.events, [fresh]);
    assertEquals(retry.r, first.r);
    assertEquals(first.req, expectedReq);
    assertEquals((await call(first.r.nextState, page)).r.events, []);
  });

  if (f.stamped) {
    test(`${f.name} emits an EDITED record (same id, newer modified) once`, async () => {
      const m1 = mockCtx([{ body: listEnvelope([rec("z", "2026-11-10 09:00:00")]) }]);
      const seed = await f.trigger.poll!(
        { params: f.params, state: {}, subscriptionId: "s" },
        m1.ctx,
      );
      const edited = rec("z", "2026-11-10 09:30:00");
      const m2 = mockCtx([{ body: listEnvelope([edited]) }]);
      const out = await f.trigger.poll!(
        { params: f.params, state: seed.nextState, subscriptionId: "s" },
        m2.ctx,
      );
      assertEquals(out.events, [edited]);
    });
  }
}
