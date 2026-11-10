import { test } from "node:test";
import assert from "node:assert/strict";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";

const trigger = (key: string) => app.triggers.find((t) => t.key === key)!;

const rec = (id: string, updatedAt = "2026-11-10T08:00:00Z") => ({
  id,
  properties: { createdate: "2026-11-09T12:00:00Z" },
  createdAt: "2026-11-09T12:00:00Z",
  updatedAt,
});

async function poll(
  key: string,
  results: unknown[],
  state: unknown,
  params: Record<string, unknown> = {},
) {
  const mock = mockCtx([{ body: { results } }]);
  const result = await trigger(key).poll!({ params, state }, mock.ctx);
  return { ...mock, result };
}

// [trigger key, search path, literal sort rule]
const NEW: Array<[string, string, string]> = [
  ["new-company", "/crm/v3/objects/companies/search", "createdate"],
  ["new-deal", "/crm/v3/objects/deals/search", "createdate"],
  ["new-ticket", "/crm/v3/objects/tickets/search", "createdate"],
];
const UPDATED: Array<[string, string, string]> = [
  ["new-or-updated-contact", "/crm/v3/objects/contacts/search", "lastmodifieddate"],
  ["new-or-updated-company", "/crm/v3/objects/companies/search", "hs_lastmodifieddate"],
  ["new-or-updated-deal", "/crm/v3/objects/deals/search", "hs_lastmodifieddate"],
  ["new-or-updated-ticket", "/crm/v3/objects/tickets/search", "hs_lastmodifieddate"],
];

for (const [key, path, prop] of NEW) {
  test(`${key}: seeds without emitting, emits only new records, retries idempotently`, async () => {
    const seeded = await poll(key, [rec("2"), rec("1")], {});
    assert.deepEqual(seeded.result.events, []);
    assert.equal(seeded.result.nextState.seeded, true);
    const changed = await poll(key, [rec("3"), rec("2"), rec("1")], seeded.result.nextState);
    assert.deepEqual(changed.result.events, [rec("3")]);
    const again = await poll(key, [rec("3"), rec("2"), rec("1")], seeded.result.nextState);
    assert.deepEqual(again.result, changed.result);
  });

  test(`${key}: searches ${path} newest-created first (literal request)`, async () => {
    const { calls } = await poll(key, [], {}, { query: "acme" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].url, `https://api.hubapi.com${path}`);
    assert.deepEqual(JSON.parse(calls[0].body ?? "{}"), {
      query: "acme",
      sorts: [{ propertyName: prop, direction: "DESCENDING" }],
      limit: 100,
    });
  });
}

for (const [key, path, prop] of UPDATED) {
  test(`${key}: seeds, emits new records, and re-emits an edited record (new updatedAt)`, async () => {
    const seeded = await poll(key, [rec("2", "2026-11-10T09:00:00Z"), rec("1")], {});
    assert.deepEqual(seeded.result.events, []);
    assert.equal(seeded.result.nextState.seeded, true);
    // record 1 is edited, record 3 is new; record 2 is unchanged
    const page = [
      rec("1", "2026-11-10T10:00:00Z"),
      rec("3", "2026-11-10T09:30:00Z"),
      rec("2", "2026-11-10T09:00:00Z"),
    ];
    const changed = await poll(key, page, seeded.result.nextState);
    assert.deepEqual(changed.result.events, [page[1], page[0]]);
    const again = await poll(key, page, seeded.result.nextState);
    assert.deepEqual(again.result, changed.result);
  });

  test(`${key}: searches ${path} by ${prop}, newest first (literal request)`, async () => {
    const { calls } = await poll(key, [], {});
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].url, `https://api.hubapi.com${path}`);
    assert.deepEqual(JSON.parse(calls[0].body ?? "{}"), {
      sorts: [{ propertyName: prop, direction: "DESCENDING" }],
      limit: 100,
    });
  });
}

// [trigger key, list path, a row]
const SNAPSHOTS: Array<[string, string, (id: string) => unknown]> = [
  ["new-form", "/marketing/v3/forms/", (id) => ({ id, name: `Form ${id}` })],
  ["new-owner", "/crm/v3/owners", (id) => ({ id, email: `${id}@example.com` })],
];

for (const [key, path, row] of SNAPSHOTS) {
  test(`${key}: seeds, then emits only rows added; walks every page; literal requests`, async () => {
    const page = (ids: string[], after?: string) => ({
      results: ids.map(row),
      ...(after ? { paging: { next: { after } } } : {}),
    });
    const m1 = mockCtx([{ body: page(["a", "b"], "cursor-2") }, { body: page(["c"]) }]);
    const seeded = await trigger(key).poll!({ params: {}, state: {} }, m1.ctx);
    assert.deepEqual(seeded.events, []);
    assert.equal(m1.calls.length, 2);
    assert.equal(m1.calls[0].method, "GET");
    assert.equal(m1.calls[0].url, `https://api.hubapi.com${path}?limit=100`);
    assert.equal(m1.calls[1].url, `https://api.hubapi.com${path}?limit=100&after=cursor-2`);

    const m2 = mockCtx([{ body: page(["a", "b"], "cursor-2") }, { body: page(["c", "d"]) }]);
    const next = await trigger(key).poll!({ params: {}, state: seeded.nextState }, m2.ctx);
    assert.deepEqual(next.events.map((e) => (e as { key: string }).key), ["d"]);
    assert.equal((next.events[0] as { change: string }).change, "added");
    const m3 = mockCtx([{ body: page(["a", "b"], "cursor-2") }, { body: page(["c", "d"]) }]);
    const again = await trigger(key).poll!({ params: {}, state: seeded.nextState }, m3.ctx);
    assert.deepEqual(again, next);
  });

  test(`${key}: a collection larger than the cap fails loudly instead of being half-watched`, async () => {
    const pages = Array.from({ length: 20 }, (_, i) => ({
      body: { results: [row(`r${i}`)], paging: { next: { after: `c${i}` } } },
    }));
    await assert.rejects(
      trigger(key).poll!({ params: {}, state: {} }, mockCtx(pages).ctx),
      /more than 2000/,
    );
  });
}

test("every new poll trigger declares output, sample and a poll without onSubscribe", () => {
  const keys = [...NEW, ...UPDATED, ...SNAPSHOTS].map(([k]) => k);
  for (const key of keys) {
    const t = trigger(key);
    assert.ok(t.output.length > 0, key);
    assert.notEqual(t.sample, undefined, key);
    assert.equal(typeof t.poll, "function", key);
    assert.equal(t.onSubscribe, undefined, key);
  }
  assert.equal(new Set(app.triggers.map((t) => t.key)).size, app.triggers.length);
});
