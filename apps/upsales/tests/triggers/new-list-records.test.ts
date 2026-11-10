import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import activity from "../../triggers/new-activity.ts";
import appointment from "../../triggers/new-appointment.ts";
import campaign from "../../triggers/new-campaign.ts";
import comment from "../../triggers/new-comment.ts";
import company from "../../triggers/new-company.ts";
import order from "../../triggers/new-order.ts";
import product from "../../triggers/new-product.ts";
import subscription from "../../triggers/new-subscription.ts";
import ticket from "../../triggers/new-ticket.ts";
import user from "../../triggers/new-user.ts";
import { clock } from "../../lib/walk.ts";

const NOW = Date.parse("2026-11-10T12:00:00.000Z");
const row = { id: 9, regDate: "2026-11-10T12:01:00.000Z" };
const cases = [
  ["activity", activity, "/api/v2/activities"],
  ["appointment", appointment, "/api/v2/appointments"],
  ["campaign", campaign, "/api/v2/projects"],
  ["comment", comment, "/api/v2/comments"],
  ["company", company, "/api/v2/accounts"],
  ["order", order, "/api/v2/orders"],
  ["product", product, "/api/v2/products"],
  ["subscription", subscription, "/api/v2/agreements"],
  ["ticket", ticket, "/api/v2/tickets"],
  ["user", user, "/api/v2/users"],
] as const;

for (const [name, trigger, path] of cases) {
  test(`new-${name} seeds, emits, retries, and requests the literal id crawl`, async () => {
    clock.now = () => NOW;
    const seedCtx = mockCtx([]);
    const seed = await trigger.poll!(
      { params: {}, state: {}, subscriptionId: "test-sub" },
      seedCtx.ctx,
    );
    assertEquals(seed.events, []);
    assertEquals((seed.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seedCtx.calls, []);
    const firstCtx = mockCtx([{ body: listEnvelope([row]) }]);
    const first = await trigger.poll!({
      params: {},
      state: seed.nextState,
      subscriptionId: "test-sub",
    }, firstCtx.ctx);
    assertEquals(first.events, [row]);
    assertEquals(firstCtx.calls[0].method, "GET");
    assertEquals(
      firstCtx.calls[0].url,
      `https://integration.upsales.com${path}?limit=1000&sort=id&id=gt%3A0`,
    );
    const retry = await trigger.poll!({
      params: {},
      state: seed.nextState,
      subscriptionId: "test-sub",
    }, mockCtx([{ body: listEnvelope([row]) }]).ctx);
    assertEquals(retry, first);
    const old = { id: 10, regDate: "2026-11-10T11:00:00.000Z" };
    const oldResult = await trigger.poll!({
      params: {},
      state: seed.nextState,
      subscriptionId: "test-sub",
    }, mockCtx([{ body: listEnvelope([old]) }]).ctx);
    assertEquals(oldResult.events, []);
  });
}
