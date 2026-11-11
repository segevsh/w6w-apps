import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import newCall from "../../triggers/new-call.ts";
import newOrUpdatedCall from "../../triggers/new-or-updated-call.ts";
import newContact from "../../triggers/new-contact.ts";
import newTransaction from "../../triggers/new-transaction.ts";
import newProduct from "../../triggers/new-product.ts";
import newOrUpdatedProduct from "../../triggers/new-or-updated-product.ts";
import newEvent from "../../triggers/new-event.ts";
import newUser from "../../triggers/new-user.ts";

// One case set per newest-first trigger (brief 5 1-4): the literal request carries the sort argument.
const input = { params: {}, subscriptionId: "sub_1" };
const paged = { limit: "100", page: "0" };
const feeds = [
  {
    name: "new-call",
    trigger: newCall,
    path: "/v1/eventCalls",
    query: { eventType: "ALL", orderColumn: "createdAt", orderBy: "desc", ...paged },
    wrap: (rows: unknown[]) => ({ data: { eventCalls: rows, count: rows.length } }),
    row: (id: number) => ({ id, updatedAt: "u1" }),
  },
  {
    name: "new-or-updated-call",
    trigger: newOrUpdatedCall,
    path: "/v1/eventCalls",
    query: { eventType: "ALL", orderColumn: "updatedAt", orderBy: "desc", ...paged },
    wrap: (rows: unknown[]) => ({ data: { eventCalls: rows, count: rows.length } }),
    row: (id: number) => ({ id, updatedAt: "u1" }),
  },
  {
    name: "new-contact",
    trigger: newContact,
    path: "/v1/contacts",
    query: { orderColumn: "createdAt", orderBy: "desc", ...paged },
    wrap: (rows: unknown[]) => ({ data: { contacts: rows, count: rows.length } }),
    row: (id: number) => ({ id, email: "ada@example.test" }),
  },
  {
    name: "new-transaction",
    trigger: newTransaction,
    path: "/v1/transactions",
    query: { sort: "desc", ...paged },
    wrap: (rows: unknown[]) => ({ count: rows.length, data: rows }),
    row: (id: number) => ({ id, value: 10 }),
  },
  {
    name: "new-product",
    trigger: newProduct,
    path: "/v1/products",
    query: { orderColumn: "createdAt", orderBy: "desc", ...paged },
    wrap: (rows: unknown[]) => ({ data: { products: rows, count: rows.length } }),
    row: (id: number) => ({ id, name: "p", updatedAt: "u1" }),
  },
  {
    name: "new-or-updated-product",
    trigger: newOrUpdatedProduct,
    path: "/v1/products",
    query: { orderColumn: "updatedAt", orderBy: "desc", ...paged },
    wrap: (rows: unknown[]) => ({ data: { products: rows, count: rows.length } }),
    row: (id: number) => ({ id, name: "p", updatedAt: "u1" }),
  },
  {
    name: "new-event",
    trigger: newEvent,
    path: "/v1/events",
    query: { latestFirst: "true", ...paged },
    wrap: (rows: unknown[]) => ({ data: rows, count: rows.length }),
    row: (id: number) => ({ id, name: "e" }),
  },
];

for (const { name, trigger, path, query, wrap, row } of feeds) {
  test(`${name}: seeds, emits only unseen rows, retries idempotently`, async () => {
    const seeded = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: wrap([row(1)]) }]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const run = () =>
      trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: wrap([row(2), row(1)]) }]).ctx,
      );
    const first = await run();
    assertEquals(first.events, [row(2)]);
    assertEquals(await run(), first);
  });

  test(`${name}: requests the literal sorted page`, async () => {
    const c = mockCtx([{ body: wrap([row(1)]) }]);
    await trigger.poll!({ ...input, state: {} }, c.ctx);
    assertEquals(c.calls.length, 1);
    assertEquals(c.calls[0].method, "GET");
    assertEquals(pathOf(c.calls[0].url), path);
    assertEquals(queryOf(c.calls[0].url), query);
  });
}

for (const { name, trigger, wrap } of feeds.filter((f) => f.name.startsWith("new-or-updated"))) {
  test(`${name}: an edited record is a new event`, async () => {
    const seeded = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: wrap([{ id: 1, updatedAt: "u1" }]) }]).ctx,
    );
    const edited = { id: 1, updatedAt: "u2" };
    const r = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: wrap([edited]) }]).ctx,
    );
    assertEquals(r.events, [edited]);
  });
}

const user = (id: number) => ({ id, email: `u${id}@example.test` });
const users = (ids: number[]) => ({ body: { data: { users: ids.map(user), count: ids.length } } });

test("new-user: seeds, emits only added users, retries idempotently", async () => {
  const seeded = await newUser.poll!({ ...input, state: {} }, mockCtx([users([1, 2])]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const run = () =>
    newUser.poll!({ ...input, state: seeded.nextState }, mockCtx([users([1, 2, 3])]).ctx);
  const first = await run();
  assertEquals(first.events, [user(3)]);
  assertEquals(await run(), first);
  const edited = await newUser.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { data: { users: [{ ...user(1), email: "new@example.test" }, user(2)] } } }])
      .ctx,
  );
  assertEquals(edited.events, []);
});

test("new-user: reads the whole list with one literal GET, then a further page only after a full one", async () => {
  const c = mockCtx([users([1])]);
  await newUser.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(c.calls.length, 1);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(pathOf(c.calls[0].url), "/v1/users");
  assertEquals(queryOf(c.calls[0].url), { limit: "100", page: "0" });

  const full = Array.from({ length: 100 }, (_, i) => i + 1);
  const two = mockCtx([users(full), users([101])]);
  const r = await newUser.poll!({ ...input, state: {} }, two.ctx);
  assertEquals(r.events, []);
  assertEquals(two.calls.map((call) => queryOf(call.url)), [
    { limit: "100", page: "0" },
    { limit: "100", page: "1" },
  ]);
});

test("new-user: a list that never ends is refused rather than compared", async () => {
  const full = Array.from({ length: 100 }, (_, i) => i + 1);
  const { ctx } = mockCtx(Array.from({ length: 50 }, () => users(full)));
  await assertRejects(() => newUser.poll!({ ...input, state: {} }, ctx), Error, "more users");
});
