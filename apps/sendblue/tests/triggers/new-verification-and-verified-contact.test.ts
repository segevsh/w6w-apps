import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import newVerification from "../../triggers/new-verification.ts";
import newVerifiedContact from "../../triggers/new-verified-contact.ts";
import { clock } from "../../lib/triggers.ts";
import { mockCtx } from "../_helpers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const sent = (c: { method: string; url: string }) => {
  const u = new URL(c.url);
  return { method: c.method, path: u.pathname, query: Object.fromEntries(u.searchParams) };
};

const T0 = Date.parse("2026-11-10T10:00:00Z");
const OLD = "2026-11-10T09:00:00.000Z";
const NEW = "2026-11-10T10:03:00.000Z";
const ver = (sid: string, date_created: string) => ({ sid, status: "pending", date_created });
const reply = (data: unknown[], has_more = false) => ({
  body: { data, pagination: { has_more }, status: "OK" },
});
const query = (offset: string) => ({
  updated_at_gte: "2026-11-10T09:58:00Z",
  limit: "100",
  offset,
});

describe("new-verification", () => {
  const input = (state: unknown) => ({ params: {}, state });
  const path = "/api/v2/verify/verifications";

  test("seeds, emits the new verification, retries identically, sends the literal request", async () => {
    clock.now = () => T0;
    const seed = mockCtx([reply([ver("v1", OLD)])]);
    const seeded = await newVerification.poll!(input({}), seed.ctx);
    assert.deepEqual(seeded.events, []);
    assert.equal(seeded.nextState.seeded, true);
    assert.deepEqual(sent(seed.calls[0]), { method: "GET", path, query: query("0") });
    clock.now = () => T0 + 300_000;
    const run = () => mockCtx([reply([ver("v2", NEW), ver("v1", OLD)])]);
    const first = run();
    const out = await newVerification.poll!(input(seeded.nextState), first.ctx);
    const retry = await newVerification.poll!(input(seeded.nextState), run().ctx);
    assert.deepEqual(out.events, [ver("v2", NEW)]);
    assert.deepEqual(retry, out);
    assert.deepEqual(sent(first.calls[0]), { method: "GET", path, query: query("0") });
  });

  test("pages with offset while has_more, resumes past maxPages, then moves the cursor", async () => {
    const page = (n: number, more: boolean) =>
      reply(Array.from({ length: 100 }, (_, i) => ver(`p${n}-${i}`, NEW)), more);
    clock.now = () => T0;
    const seeded = await newVerification.poll!(input({}), mockCtx([reply([])]).ctx);
    clock.now = () => T0 + 300_000;
    const c1 = mockCtx([page(0, true), page(1, true), page(2, true)]);
    const one = await newVerification.poll!(input(seeded.nextState), c1.ctx);
    assert.equal(one.events.length, 300);
    assert.deepEqual(c1.calls.map((c) => sent(c).query.offset), ["0", "100", "200"]);
    assert.equal(one.nextState.cursor, T0);
    clock.now = () => T0 + 600_000;
    const c2 = mockCtx([page(3, false)]);
    const two = await newVerification.poll!(input(one.nextState), c2.ctx);
    assert.deepEqual(sent(c2.calls[0]).query, query("300"));
    assert.equal(two.events.length, 100);
    assert.equal(two.nextState.cursor, T0 + 300_000);
  });

  test("never emits a verification created before the seed (floor), even if updated since", async () => {
    clock.now = () => T0;
    const seeded = await newVerification.poll!(input({}), mockCtx([reply([])]).ctx);
    clock.now = () => T0 + 300_000;
    const one = await newVerification.poll!(
      input(seeded.nextState),
      mockCtx([reply([ver("old", OLD)])]).ctx,
    );
    assert.deepEqual(one.events, []);
    clock.now = () => T0 + 600_000;
    const two = await newVerification.poll!(
      input(one.nextState),
      mockCtx([reply([ver("fresh", NEW)])]).ctx,
    );
    assert.deepEqual(two.events, [ver("fresh", NEW)]);
  });
});

describe("new-verified-contact", () => {
  const contact = (phone_number: string) => ({ phone_number, verified: false });
  const res = (...c: unknown[]) => ({
    body: { data: { contacts: c, line: { phone_number: "+12125550101", type: "shared" } } },
  });
  test("seeds, emits only the added contact, retries identically, sends the literal request", async () => {
    const seed = mockCtx([res(contact("+12125550100"))]);
    const seeded = await newVerifiedContact.poll!({ params: {}, state: {} }, seed.ctx);
    assert.deepEqual(seeded.events, []);
    assert.deepEqual(sent(seed.calls[0]), {
      method: "GET",
      path: "/v3/verified-contacts",
      query: {},
    });
    const run = () => mockCtx([res(contact("+12125550199"), contact("+12125550100"))]);
    const out = await newVerifiedContact.poll!({ params: {}, state: seeded.nextState }, run().ctx);
    const again = await newVerifiedContact.poll!(
      { params: {}, state: seeded.nextState },
      run().ctx,
    );
    assert.deepEqual(out.events, [contact("+12125550199")]);
    assert.deepEqual(again, out);
  });
});
