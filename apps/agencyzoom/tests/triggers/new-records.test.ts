import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newTask from "../../triggers/new-task.ts";
import newCustomerPolicy from "../../triggers/new-customer-policy.ts";
import newEmployee from "../../triggers/new-employee.ts";
import newCsr from "../../triggers/new-csr.ts";

const run = async (
  t: { poll?: (i: never, c: never) => Promise<{ events: unknown[]; nextState: unknown }> },
  params: unknown,
  state: unknown,
  body: unknown,
) => {
  const m = mockCtx([{ body }]);
  const r = await t.poll!({ params, state, subscriptionId: "s" } as never, m.ctx as never);
  return { r, call: m.calls[0], calls: m.calls };
};

// --- newest-first searches (pollFromListAction) --------------------------------------------------

const feeds = [
  {
    name: "new-customer",
    trigger: newCustomer,
    url: `${API_ROOT}/customers`,
    request: { sort: "id", order: "desc", page: 0, pageSize: 100 },
    wrap: (items: unknown[]) => ({ customers: items, totalCount: 500, page: 0, pageSize: 100 }),
    old: { id: 10, firstname: "Old" },
    fresh: { id: 11, firstname: "New" },
  },
  {
    name: "new-task",
    trigger: newTask,
    url: `${API_ROOT}/tasks/list`,
    request: { sort: "id", order: "desc", page: 0, pageSize: 100 },
    wrap: (items: unknown[]) => ({ tasks: items, totalCount: 500, page: 0, pageSize: 100 }),
    old: { id: 20, title: "Old task" },
    fresh: { id: 21, title: "New task" },
  },
];

for (const f of feeds) {
  test(`${f.name}: seeds, emits only the new record, retries identically, literal request`, async () => {
    const seed = await run(f.trigger, {}, {}, f.wrap([f.old]));
    assertEquals(seed.r.events, []);
    assertEquals((seed.r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.call.method, "POST");
    assertEquals(seed.call.url, f.url);
    assertEquals(JSON.parse(seed.call.body ?? "null"), f.request);

    const a = await run(f.trigger, {}, seed.r.nextState, f.wrap([f.fresh, f.old]));
    const b = await run(f.trigger, {}, seed.r.nextState, f.wrap([f.fresh, f.old]));
    assertEquals(a.r.events, [f.fresh]);
    assertEquals(a.r, b.r);
    assertEquals(JSON.parse(a.call.body ?? "null"), f.request);
  });
}

// --- small collections (pollSnapshot) ------------------------------------------------------------

const snaps = [
  {
    name: "new-customer-policy",
    trigger: newCustomerPolicy,
    params: { customerId: 501 },
    method: "GET",
    url: `${API_ROOT}/customers/501/policies`,
    wrap: (items: unknown[]) => items,
    a: { id: 7001, policyNumber: "POL-1" },
    b: { id: 7002, policyNumber: "POL-2" },
  },
  {
    name: "new-employee",
    trigger: newEmployee,
    params: {},
    method: "GET",
    url: `${API_ROOT}/employees`,
    wrap: (items: unknown[]) => items,
    a: { id: 31, firstname: "Sam" },
    b: { id: 32, firstname: "Kim" },
  },
  {
    name: "new-csr",
    trigger: newCsr,
    params: {},
    method: "GET",
    url: `${API_ROOT}/csrs`,
    wrap: (items: unknown[]) => ({ csrs: items }),
    a: { id: 12, name: "Pat" },
    b: { id: 13, name: "Lee" },
  },
];

for (const s of snaps) {
  test(`${s.name}: seeds without events, emits only the added record, retries identically, literal request`, async () => {
    const seed = await run(s.trigger, s.params, {}, s.wrap([s.a]));
    assertEquals(seed.r.events, []);
    assertEquals((seed.r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.call.method, s.method);
    assertEquals(seed.call.url, s.url);

    const x = await run(s.trigger, s.params, seed.r.nextState, s.wrap([s.a, s.b]));
    const y = await run(s.trigger, s.params, seed.r.nextState, s.wrap([s.a, s.b]));
    assertEquals(x.r.events, [s.b]);
    assertEquals(x.r, y.r);

    const removed = await run(s.trigger, s.params, x.r.nextState, s.wrap([s.b]));
    assertEquals(removed.r.events, []);
  });
}

test("new-customer-policy: a single flat policy object (the documented schema) is one policy", async () => {
  const one = { id: 7001, policyNumber: "POL-1" };
  const seed = await run(newCustomerPolicy, { customerId: 501 }, {}, []);
  const got = await run(newCustomerPolicy, { customerId: 501 }, seed.r.nextState, one);
  assertEquals(got.r.events, [one]);
});
