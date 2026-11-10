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
import orUpdActivity from "../../triggers/new-or-updated-activity.ts";
import orUpdAppointment from "../../triggers/new-or-updated-appointment.ts";
import orUpdCompany from "../../triggers/new-or-updated-company.ts";
import orUpdContact from "../../triggers/new-or-updated-contact.ts";
import orUpdOrder from "../../triggers/new-or-updated-order.ts";
import orUpdSubscription from "../../triggers/new-or-updated-subscription.ts";
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
    // The seed reads the vendor's total, then the newest row, and stores that id as the position.
    const seedCtx = mockCtx([
      { body: listEnvelope([{ id: 1 }], 3) },
      { body: listEnvelope([{ id: 4 }], 3) },
    ]);
    const seed = await trigger.poll!(
      { params: {}, state: {}, subscriptionId: "test-sub" },
      seedCtx.ctx,
    );
    assertEquals(seed.events, []);
    assertEquals((seed.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seedCtx.calls.map((c) => c.url), [
      `https://integration.upsales.com${path}?limit=1`,
      `https://integration.upsales.com${path}?limit=1&offset=2&sort=id`,
    ]);
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
      `https://integration.upsales.com${path}?limit=1000&sort=id&id=gt%3A4`,
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

for (const [name, trigger] of cases) {
  test(`new-${name} never emits rows that existed at the seed, even with no creation stamp`, async () => {
    clock.now = () => NOW;
    const seed = await trigger.poll!(
      { params: {}, state: {}, subscriptionId: "test-sub" },
      mockCtx([{ body: listEnvelope([{ id: 1 }], 3) }, { body: listEnvelope([{ id: 3 }], 3) }]).ctx,
    );
    clock.now = () => NOW + 300_000;
    // The vendor answers id>3 with nothing the seed had not seen; a stamp-less row above 3 is new.
    const none = mockCtx([{ body: listEnvelope([]) }]);
    const idle = await trigger.poll!(
      { params: {}, state: seed.nextState, subscriptionId: "test-sub" },
      none.ctx,
    );
    assertEquals(idle.events, []);
    assertEquals(none.calls[0].url.includes("id=gt%3A3"), true);
    const fresh = mockCtx([{ body: listEnvelope([{ id: 4, name: "x" }]) }]);
    const got = await trigger.poll!(
      { params: {}, state: seed.nextState, subscriptionId: "test-sub" },
      fresh.ctx,
    );
    assertEquals(got.events, [{ id: 4, name: "x" }]);
  });

  test(`new-${name} seed on an empty collection crawls from id 0`, async () => {
    clock.now = () => NOW;
    const empty = mockCtx([{ body: listEnvelope([], 0) }]);
    const seed = await trigger.poll!(
      { params: {}, state: {}, subscriptionId: "test-sub" },
      empty.ctx,
    );
    assertEquals(empty.calls.length, 1);
    assertEquals((seed.nextState as { mark?: unknown }).mark, 0);
  });

  test(`new-${name} seed fails and stores nothing when the newest row vanished between reads`, async () => {
    clock.now = () => NOW;
    const raced = mockCtx([{ body: listEnvelope([{ id: 1 }], 3) }, { body: listEnvelope([], 3) }]);
    let failed = false;
    try {
      await trigger.poll!({ params: {}, state: {}, subscriptionId: "test-sub" }, raced.ctx);
    } catch {
      failed = true;
    }
    assertEquals(failed, true);
  });
}

const updated = [
  ["activity", orUpdActivity, "/api/v2/activities"],
  ["appointment", orUpdAppointment, "/api/v2/appointments"],
  ["company", orUpdCompany, "/api/v2/accounts"],
  ["contact", orUpdContact, "/api/v2/contacts"],
  ["order", orUpdOrder, "/api/v2/orders"],
  ["subscription", orUpdSubscription, "/api/v2/agreements"],
] as const;

for (const [name, trigger, path] of updated) {
  test(`new-or-updated-${name} asks for modDate>=window, and an edited record emits again`, async () => {
    clock.now = () => NOW;
    const seedCtx = mockCtx([]);
    const seed = await trigger.poll!(
      { params: {}, state: {}, subscriptionId: "test-sub" },
      seedCtx.ctx,
    );
    assertEquals(seed.events, []);
    assertEquals(seedCtx.calls, []);
    clock.now = () => NOW + 300_000;
    const created = { id: 7, modDate: "2026-11-10T12:01:00.000Z" };
    const c1 = mockCtx([{ body: listEnvelope([created]) }]);
    const first = await trigger.poll!(
      { params: {}, state: seed.nextState, subscriptionId: "test-sub" },
      c1.ctx,
    );
    assertEquals(first.events, [created]);
    assertEquals(
      c1.calls[0].url,
      `https://integration.upsales.com${path}?limit=1000&sort=id&modDate=gte%3A2026-11-10T11%3A58%3A00.000Z&id=gt%3A0`,
    );
    // Same record, same modDate: no repeat. Same record edited later: a new event.
    clock.now = () => NOW + 600_000;
    const edited = { id: 7, modDate: "2026-11-10T12:07:00.000Z" };
    const second = await trigger.poll!(
      { params: {}, state: first.nextState, subscriptionId: "test-sub" },
      mockCtx([{ body: listEnvelope([created, edited]) }]).ctx,
    );
    assertEquals(second.events, [edited]);
    // A record last modified before the seed is never emitted.
    const stale = { id: 8, modDate: "2026-11-10T11:00:00.000Z" };
    const third = await trigger.poll!(
      { params: {}, state: seed.nextState, subscriptionId: "test-sub" },
      mockCtx([{ body: listEnvelope([stale]) }]).ctx,
    );
    assertEquals(third.events, []);
  });
}
