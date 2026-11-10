import { test } from "node:test";
import nodeAssert from "node:assert/strict";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import newPayout from "../../triggers/new-payout.ts";
import newProperty from "../../triggers/new-property.ts";
import newPropertyImage from "../../triggers/new-property-image.ts";
import newPropertyReview from "../../triggers/new-property-review.ts";
import newReservationMessage from "../../triggers/new-reservation-message.ts";
import newTask from "../../triggers/new-task.ts";
import newTeammate from "../../triggers/new-teammate.ts";
import inquiry from "../../triggers/new-or-updated-inquiry.ts";

// Bounded lists (brief 9.1 c): the list is read whole, compared check to check, only added rows fire.
const cases = [
  {
    name: "new-property",
    trigger: newProperty,
    params: {},
    path: "/v2/properties",
    query: { page: "1", per_page: "100" },
  },
  {
    name: "new-payout",
    trigger: newPayout,
    params: {},
    path: "/v2/payouts",
    query: { page: "1", per_page: "100" },
  },
  {
    name: "new-teammate",
    trigger: newTeammate,
    params: {},
    path: "/v2/teammates",
    query: { page: "1", per_page: "100" },
  },
  {
    name: "new-property-review",
    trigger: newPropertyReview,
    params: { propertyId: "prop-1" },
    path: "/v2/properties/prop-1/reviews",
    query: { page: "1", per_page: "100" },
  },
  {
    name: "new-task",
    trigger: newTask,
    params: { propertyIds: "prop-1,prop-2" },
    path: "/v2/tasks",
    query: { page: "1", per_page: "100" },
    multi: ["properties[]", "prop-1", "prop-2"],
  },
  {
    name: "new-property-image",
    trigger: newPropertyImage,
    params: { propertyId: "prop-1" },
    path: "/v2/properties/prop-1/images",
    query: {},
  },
  {
    name: "new-reservation-message",
    trigger: newReservationMessage,
    params: { reservationId: "res-1" },
    path: "/v2/reservations/res-1/messages",
    query: {},
  },
];

for (const c of cases) {
  const rows = (ids: string[]) => ({ body: { data: ids.map((id) => ({ id, n: id })) } });
  const input = { params: c.params, subscriptionId: "sub-1" };

  test(`${c.name}: seed emits nothing, a new row fires once, the request is literal`, async () => {
    const seed = mockCtx([rows(["a", "b"])]);
    const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const go = () =>
      c.trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([rows(["a", "b", "c"])]).ctx);
    const first = await go();
    assertEquals(first.events, [{ id: "c", n: "c" }]);
    assertEquals(await go(), first);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(pathOf(seed.calls[0].url), c.path);
    const q = new URL(seed.calls[0].url).searchParams;
    assertEquals(queryOf(seed.calls[0].url)["page"], c.query.page);
    if (c.multi) assertEquals(q.getAll(c.multi[0]), c.multi.slice(1));
    const plain = Object.fromEntries([...q].filter(([k]) => !k.endsWith("[]")));
    assertEquals(plain, c.query);
  });
}

for (const c of cases.filter((x) => x.params && Object.keys(x.params).length)) {
  test(`${c.name}: an unset parent id is refused before any request`, async () => {
    const empty = Object.fromEntries(Object.keys(c.params).map((k) => [k, "  "]));
    const m = mockCtx([]);
    await nodeAssert.rejects(() =>
      c.trigger.poll!({ params: empty, subscriptionId: "sub-1", state: {} }, m.ctx)
    );
    assertEquals(m.calls.length, 0);
  });
}

test("new-property: a second full page is read and compared", async () => {
  const page = (from: number, n: number) => ({
    body: { data: Array.from({ length: n }, (_, i) => ({ id: `p${from + i}` })) },
  });
  const input = { params: {}, subscriptionId: "sub-1" };
  const seed = mockCtx([page(0, 100), page(100, 1)]);
  const seeded = await newProperty.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls.map((x) => queryOf(x.url)["page"]), ["1", "2"]);
  const next = await newProperty.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(0, 100), { body: { data: [{ id: "p100" }, { id: "p101" }] } }]).ctx,
  );
  assertEquals(next.events, [{ id: "p101" }]);
});

// since-filter shape (brief 9.1 b, 9.8, 9.9)
const inq = (id: string, at: string) => ({ id, last_message_at: at });
const fullPage = (tag: string, at: string, n = 100) => ({
  body: { data: Array.from({ length: n }, (_, i) => inq(`${tag}-${i}`, at)) },
});
const iparams = { propertyIds: "prop-1" };

test("new-or-updated-inquiry: seed, then only an inquiry stamped after the floor fires", async () => {
  const seed = mockCtx([{ body: { data: [inq("i1", "2020-01-01T00:00:00Z")] } }]);
  const seeded = await inquiry.poll!({ params: iparams, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const go = (state: unknown) =>
    inquiry.poll!(
      { params: iparams, state },
      mockCtx([{
        body: { data: [inq("i1", "2020-01-01T00:00:00Z"), inq("i2", "2999-01-01T00:00:00Z")] },
      }])
        .ctx,
    );
  const first = await go(seeded.nextState);
  assertEquals(first.events, [inq("i2", "2999-01-01T00:00:00Z")]);
  // the cursor is the wall clock, so a retry matches on events and seen ids
  const again = await go(seeded.nextState);
  assertEquals(again.events, first.events);
  assertEquals(
    (again.nextState as { ids: string[] }).ids,
    (first.nextState as { ids: string[] }).ids,
  );
});

test("new-or-updated-inquiry: an edited inquiry (new last_message_at) is a new event", async () => {
  const base = { v: 1, kind: "ids", seeded: true, ids: ["i1:2999-01-01T00:00:00Z"], floor: 1000 };
  const r = await inquiry.poll!(
    { params: iparams, state: { ...base, cursor: Date.now() } },
    mockCtx([{ body: { data: [inq("i1", "2999-06-01T00:00:00Z")] } }]).ctx,
  );
  assertEquals(r.events, [inq("i1", "2999-06-01T00:00:00Z")]);
});

test("new-or-updated-inquiry: the request carries the property and the since filter literally", async () => {
  const cursor = Date.parse("2026-11-10T10:00:00Z");
  const state = { v: 1, kind: "ids", seeded: true, ids: [], floor: 1000, cursor };
  const m = mockCtx([{ body: { data: [] } }]);
  await inquiry.poll!({ params: { propertyIds: "prop-1,prop-2" }, state }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(pathOf(m.calls[0].url), "/v2/inquiries");
  const q = new URL(m.calls[0].url).searchParams;
  assertEquals(q.getAll("properties[]"), ["prop-1", "prop-2"]);
  assertEquals(q.get("last_message_at"), "2026-11-10T09:58:00.000Z");
  assertEquals(q.get("page"), "1");
  assertEquals(q.get("per_page"), "100");
});

test("new-or-updated-inquiry: a window of 6 pages is drained over two checks, none twice", async () => {
  const cursor = Date.parse("2026-11-10T10:00:00Z");
  const state = { v: 1, kind: "ids", seeded: true, ids: [], floor: 1000, cursor };
  const at = "2999-01-01T00:00:00Z";
  const first = mockCtx([1, 2, 3, 4, 5].map((n) => fullPage(`p${n}`, at)));
  const one = await inquiry.poll!({ params: iparams, state }, first.ctx);
  assertEquals(one.events.length, 500);
  assertEquals(first.calls.map((x) => queryOf(x.url)["page"]), ["1", "2", "3", "4", "5"]);
  assertEquals((one.nextState as { resume?: unknown }).resume !== undefined, true);
  assertEquals((one.nextState as { cursor: number }).cursor, cursor);
  const second = mockCtx([fullPage("p6", at, 50)]);
  const two = await inquiry.poll!({ params: iparams, state: one.nextState }, second.ctx);
  assertEquals(two.events.length, 50);
  assertEquals(second.calls.map((x) => queryOf(x.url)["page"]), ["6"]);
  assertEquals(queryOf(second.calls[0].url)["last_message_at"], "2026-11-10T09:58:00.000Z");
  const ids = [...one.events, ...two.events].map((e) => (e as { id: string }).id);
  assertEquals(new Set(ids).size, 550);
  assertEquals((two.nextState as { resume?: unknown }).resume, undefined);
  assertEquals((two.nextState as { cursor: number }).cursor > cursor, true);
});

test("new-or-updated-inquiry: records from before the seed never fire, however many pages", async () => {
  const old = "2020-01-01T00:00:00Z";
  const seeded = await inquiry.poll!(
    { params: iparams, state: {} },
    mockCtx([fullPage("o", old)]).ctx,
  );
  assertEquals(seeded.events, []);
  const a = await inquiry.poll!(
    { params: iparams, state: seeded.nextState },
    mockCtx([1, 2, 3, 4, 5].map((n) => fullPage(`x${n}`, old))).ctx,
  );
  assertEquals(a.events, []);
  const b = await inquiry.poll!(
    { params: iparams, state: a.nextState },
    mockCtx([fullPage("x6", old, 50)]).ctx,
  );
  assertEquals(b.events, []);
  const c = await inquiry.poll!(
    { params: iparams, state: b.nextState },
    mockCtx([{ body: { data: [inq("fresh", "2999-01-01T00:00:00Z")] } }]).ctx,
  );
  assertEquals(c.events, [inq("fresh", "2999-01-01T00:00:00Z")]);
});
