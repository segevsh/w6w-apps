import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import newOfferCode from "../../triggers/new-offer-code.ts";
import newProduct from "../../triggers/new-product.ts";
import newReview from "../../triggers/new-review.ts";
import newSubscriber from "../../triggers/new-subscriber.ts";
import newVariant from "../../triggers/new-variant.ts";
import newVariantCategory from "../../triggers/new-variant-category.ts";
import { mockCtx } from "../_helpers.ts";

// Gumroad's list endpoints for offer codes, variant categories and variants return the whole
// collection with no paging parameters (gumroad.com/api, read 2026-11-10): each trigger is a
// pollSnapshot over that one request, `added` only. `new-product` is the exception: its list is
// paged (`next_page_key`), so it is also covered by the multi-page cases at the end of this file.
const PID = "A-m3CDDC5dlrSdKZp0RFhA==";
const CID = "mN7CdHiwHaR9FlxKvF-n-g==";
const sub = "sub";

const CASES = [
  {
    name: "new-product",
    trigger: newProduct,
    params: {},
    path: "/v2/products",
    envelope: "products",
    old: { id: "p-old", name: "Old" },
    fresh: { id: "p-new", name: "New" },
  },
  {
    name: "new-offer-code",
    trigger: newOfferCode,
    params: { productId: PID },
    path: `/v2/products/${encodeURIComponent(PID)}/offer_codes`,
    envelope: "offer_codes",
    old: { id: "oc-old", name: "OLD10" },
    fresh: { id: "oc-new", name: "NEW10" },
  },
  {
    name: "new-variant-category",
    trigger: newVariantCategory,
    params: { productId: PID },
    path: `/v2/products/${encodeURIComponent(PID)}/variant_categories`,
    envelope: "variant_categories",
    old: { id: "vc-old", title: "sizes" },
    fresh: { id: "vc-new", title: "colors" },
  },
  {
    name: "new-variant",
    trigger: newVariant,
    params: { productId: PID, variantCategoryId: CID },
    path: `/v2/products/${encodeURIComponent(PID)}/variant_categories/${
      encodeURIComponent(CID)
    }/variants`,
    envelope: "variants",
    old: { id: "v-old", name: "red" },
    fresh: { id: "v-new", name: "blue" },
  },
] as const;

for (const c of CASES) {
  const page = (rows: unknown[]) => ({ body: { success: true, [c.envelope]: rows } });

  test(`${c.name}: seeds without events, then emits only the row added after the seed`, async () => {
    const seedMock = mockCtx([page([c.old])]);
    const seed = await c.trigger.poll!(
      { params: c.params, state: {}, subscriptionId: sub },
      seedMock.ctx,
    );
    assertEquals(seed.events, []);
    assertEquals((seed.nextState as { seeded?: boolean }).seeded, true);
    const mock = mockCtx([page([c.old, c.fresh])]);
    const next = await c.trigger.poll!(
      { params: c.params, state: seed.nextState, subscriptionId: sub },
      mock.ctx,
    );
    assertEquals(next.events, [c.fresh]);
    // A removed row is not an event, and a repeat with no new row is quiet.
    const again = await c.trigger.poll!(
      { params: c.params, state: next.nextState, subscriptionId: sub },
      mockCtx([page([c.fresh])]).ctx,
    );
    assertEquals(again.events, []);
  });

  test(`${c.name}: the same state and response run twice give the same result`, async () => {
    const seed = await c.trigger.poll!(
      { params: c.params, state: {}, subscriptionId: sub },
      mockCtx([page([c.old])]).ctx,
    );
    const run = () =>
      c.trigger.poll!(
        { params: c.params, state: seed.nextState, subscriptionId: sub },
        mockCtx([page([c.old, c.fresh])]).ctx,
      );
    assertEquals(await run(), await run());
  });

  test(`${c.name}: calls the literal list endpoint`, async () => {
    const mock = mockCtx([page([])]);
    await c.trigger.poll!({ params: c.params, state: {}, subscriptionId: sub }, mock.ctx);
    assertEquals(mock.calls.length, 1);
    assertEquals(
      [
        mock.calls[0].method,
        new URL(mock.calls[0].url).pathname,
        new URL(mock.calls[0].url).search,
      ],
      ["GET", c.path, ""],
    );
  });

  test(`${c.name}: rows without an id are ignored instead of stalling the snapshot`, async () => {
    const seed = await c.trigger.poll!(
      { params: c.params, state: {}, subscriptionId: sub },
      mockCtx([page([{ id: "" }, { name: "no id" }, c.old])]).ctx,
    );
    assertEquals(seed.events, []);
    const next = await c.trigger.poll!(
      { params: c.params, state: seed.nextState, subscriptionId: sub },
      mockCtx([page([{ id: "" }, c.old, { id: "" }, c.fresh])]).ctx,
    );
    assertEquals(next.events, [c.fresh]);
  });

  test(`${c.name}: declares a non-empty output and a sample`, () => {
    assertEquals(c.trigger.output!.length > 0, true);
    assertEquals(c.trigger.sample !== undefined, true);
    assertEquals(typeof c.trigger.poll, "function");
    assertEquals(c.trigger.onSubscribe, undefined);
  });
}

// new-review: the reference says reviews are "newest first" (gumroad.com/api, read 2026-11-10).
const reviews = (rows: unknown[]) => ({ body: { success: true, product_reviews: rows } });

test("new-review: seeds, emits the unseen review, is idempotent, and requests the literal endpoint", async () => {
  const params = { productId: PID };
  const seed = await newReview.poll!(
    { params, state: {}, subscriptionId: sub },
    mockCtx([reviews([{ id: "r1" }])]).ctx,
  );
  assertEquals(seed.events, []);
  assertEquals((seed.nextState as { seeded?: boolean }).seeded, true);
  const rows = [{ id: "r2", rating: 5 }, { id: "r1" }];
  const mock = mockCtx([reviews(rows)]);
  const next = await newReview.poll!(
    { params, state: seed.nextState, subscriptionId: sub },
    mock.ctx,
  );
  assertEquals(next.events, [rows[0]]);
  const a = await newReview.poll!(
    { params, state: seed.nextState, subscriptionId: sub },
    mockCtx([reviews(rows)]).ctx,
  );
  const b = await newReview.poll!(
    { params, state: seed.nextState, subscriptionId: sub },
    mockCtx([reviews(rows)]).ctx,
  );
  assertEquals(a, b);
  assertEquals(
    [mock.calls[0].method, new URL(mock.calls[0].url).pathname, new URL(mock.calls[0].url).search],
    ["GET", `/v2/products/${encodeURIComponent(PID)}/reviews`, ""],
  );
});

test("snapshots emit only added rows, never an edited row", async () => {
  const seed = await newVariant.poll!(
    { params: { productId: PID, variantCategoryId: CID }, state: {}, subscriptionId: sub },
    mockCtx([{ body: { success: true, variants: [{ id: "v1", name: "red" }] } }]).ctx,
  );
  const next = await newVariant.poll!(
    {
      params: { productId: PID, variantCategoryId: CID },
      state: seed.nextState,
      subscriptionId: sub,
    },
    mockCtx([{ body: { success: true, variants: [{ id: "v1", name: "crimson" }] } }]).ctx,
  );
  assertEquals(next.events, []);
});

// GET /v2/products is PAGED (gumroad.com/api, read 2026-11-10): `next_page_key` goes back as
// `page_key`, 10 per page, newest first.
const pageOf = (rows: unknown[], next?: string) => ({
  body: { success: true, products: rows, ...(next ? { next_page_key: next } : {}) },
});
const reqs = (calls: { method: string; url: string }[]) =>
  calls.map((c) => [c.method, new URL(c.url).pathname, new URL(c.url).search]);

test("new-product: reads every page with a literal page_key request before snapshotting", async () => {
  const mock = mockCtx([
    pageOf([{ id: "p3" }, { id: "p2" }], "k1"),
    pageOf([{ id: "p1" }]),
  ]);
  const seed = await newProduct.poll!({ params: {}, state: {}, subscriptionId: sub }, mock.ctx);
  assertEquals(seed.events, []);
  assertEquals(reqs(mock.calls), [
    ["GET", "/v2/products", ""],
    ["GET", "/v2/products", "?page_key=k1"],
  ]);
  // A product on page 2 that is already known is not new; a new one on page 1 is.
  const next = await newProduct.poll!(
    { params: {}, state: seed.nextState, subscriptionId: sub },
    mockCtx([pageOf([{ id: "p4" }, { id: "p3" }, { id: "p2" }], "k1"), pageOf([{ id: "p1" }])]).ctx,
  );
  assertEquals(next.events, [{ id: "p4" }]);
});

test("new-product: deleting the newest product does not announce an old one as new", async () => {
  // 12 products: page 1 holds p12..p3, page 2 holds p2, p1.
  const ids = (from: number, to: number) =>
    Array.from({ length: from - to + 1 }, (_, i) => ({ id: `p${from - i}` }));
  const seed = await newProduct.poll!(
    { params: {}, state: {}, subscriptionId: sub },
    mockCtx([pageOf(ids(12, 3), "k1"), pageOf(ids(2, 1))]).ctx,
  );
  // p12 is deleted: p2 shifts from page 2 into page 1.
  const after = await newProduct.poll!(
    { params: {}, state: seed.nextState, subscriptionId: sub },
    mockCtx([pageOf(ids(11, 2), "k2"), pageOf(ids(1, 1))]).ctx,
  );
  assertEquals(after.events, []);
});

test("new-product: a cursor still present after the page cap is a loud error", async () => {
  const pages = Array.from({ length: 50 }, (_, i) => pageOf([{ id: `p${i}` }], `k${i}`));
  await assertRejects(
    () =>
      Promise.resolve(
        newProduct.poll!({ params: {}, state: {}, subscriptionId: sub }, mockCtx(pages).ctx),
      ),
    Error,
    "not snapshotting a partial list",
  );
});

test("new-subscriber: sends paginated=true, follows page_key, emits only the subscriber added", async () => {
  const params = { productId: PID };
  const path = `/v2/products/${encodeURIComponent(PID)}/subscribers`;
  const page = (rows: unknown[], next?: string) => ({
    body: { success: true, subscribers: rows, ...(next ? { next_page_key: next } : {}) },
  });
  const seedMock = mockCtx([page([{ id: "s2" }], "k1"), page([{ id: "s1" }])]);
  const seed = await newSubscriber.poll!(
    { params, state: {}, subscriptionId: sub },
    seedMock.ctx,
  );
  assertEquals(seed.events, []);
  assertEquals(reqs(seedMock.calls), [
    ["GET", path, "?paginated=true"],
    ["GET", path, "?paginated=true&page_key=k1"],
  ]);
  const next = await newSubscriber.poll!(
    { params, state: seed.nextState, subscriptionId: sub },
    mockCtx([page([{ id: "s3" }, { id: "s2" }], "k1"), page([{ id: "s1" }])]).ctx,
  );
  assertEquals(next.events, [{ id: "s3" }]);
  assertEquals(newSubscriber.params!.some((p) => p.key === "productId" && p.required), true);
  assertEquals(newSubscriber.output!.length > 0 && newSubscriber.sample !== undefined, true);
});

test("new-subscriber: a cancelled or removed subscriber is not an event and a repeat is quiet", async () => {
  const params = { productId: PID };
  const page = (rows: unknown[]) => ({ body: { success: true, subscribers: rows } });
  const seed = await newSubscriber.poll!(
    { params, state: {}, subscriptionId: sub },
    mockCtx([page([{ id: "s2" }, { id: "s1" }])]).ctx,
  );
  const gone = await newSubscriber.poll!(
    { params, state: seed.nextState, subscriptionId: sub },
    mockCtx([page([{ id: "s1" }])]).ctx,
  );
  assertEquals(gone.events, []);
  const again = await newSubscriber.poll!(
    { params, state: gone.nextState, subscriptionId: sub },
    mockCtx([page([{ id: "s1" }])]).ctx,
  );
  assertEquals(again.events, []);
});
