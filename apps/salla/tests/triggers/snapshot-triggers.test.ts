import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newBrand from "../../triggers/new-brand.ts";
import newCategory from "../../triggers/new-category.ts";
import newCoupon from "../../triggers/new-coupon.ts";
import newProduct from "../../triggers/new-product.ts";
import newCustomer from "../../triggers/new-customer.ts";

const API = "https://api.salla.dev/admin/v2";
// `url` is the LITERAL first-page request each trigger must send; `cap` the documented page cap.
const feeds = [
  { name: "new-brand", trigger: newBrand, url: `${API}/brands?page=1&per_page=60`, cap: 10 },
  {
    name: "new-category",
    trigger: newCategory,
    url: `${API}/categories?page=1&per_page=60`,
    cap: 10,
  },
  { name: "new-coupon", trigger: newCoupon, url: `${API}/coupons?page=1&per_page=60`, cap: 10 },
  { name: "new-product", trigger: newProduct, url: `${API}/products?page=1&per_page=60`, cap: 50 },
  {
    name: "new-customer",
    trigger: newCustomer,
    url: `${API}/customers?page=1&per_page=60`,
    cap: 50,
  },
];

const page = (ids: number[], totalPages = 1) => ({
  body: {
    status: 200,
    success: true,
    data: ids.map((id) => ({ id })),
    pagination: { totalPages },
  },
});
const run = (
  t: (typeof feeds)[number]["trigger"],
  state: unknown,
  pages: ReturnType<typeof page>[],
) => {
  const m = mockCtx(pages);
  return t.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx).then((r) => ({
    r,
    calls: m.calls,
  }));
};

for (const f of feeds) {
  test(`${f.name}: seeds, emits only the added record, retries identically, literal request`, async () => {
    const seed = await run(f.trigger, {}, [page([1, 2])]);
    assertEquals(seed.r.events, []);
    assertEquals((seed.r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, f.url);

    const first = await run(f.trigger, seed.r.nextState, [page([3, 2, 1])]);
    const retry = await run(f.trigger, seed.r.nextState, [page([3, 2, 1])]);
    assertEquals(first.r.events, [{ id: 3 }]);
    assertEquals(retry.r, first.r);
    assertEquals(first.calls[0].url, f.url);
    assertEquals((await run(f.trigger, first.r.nextState, [page([3, 2, 1])])).r.events, []);
  });
}

test("new-product finds a record on a later page: the whole list is read, whatever its order", async () => {
  const seed = await run(newProduct, {}, [page([1, 2], 2), page([3], 2)]);
  assertEquals(seed.calls.map((c) => c.url), [
    `${API}/products?page=1&per_page=60`,
    `${API}/products?page=2&per_page=60`,
  ]);
  const out = await run(newProduct, seed.r.nextState, [page([1, 2], 2), page([3, 4], 2)]);
  assertEquals(out.r.events, [{ id: 4 }]);
});

test("new-brand throws, naming the cap, when the list is longer than its page cap", async () => {
  const pages = Array.from({ length: 10 }, () => page([1], 11));
  let message = "";
  await run(newBrand, {}, pages).catch((e: Error) => (message = e.message));
  assertEquals(message.includes("at most 10"), true);
});
