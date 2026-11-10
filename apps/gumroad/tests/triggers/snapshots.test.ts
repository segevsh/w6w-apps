import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import newOfferCode from "../../triggers/new-offer-code.ts";
import newProduct from "../../triggers/new-product.ts";
import newReview from "../../triggers/new-review.ts";
import newVariant from "../../triggers/new-variant.ts";
import newVariantCategory from "../../triggers/new-variant-category.ts";
import { mockCtx } from "../_helpers.ts";

// Gumroad's list endpoints for products, offer codes, variant categories and variants return the
// whole collection with no paging parameters (gumroad.com/api, read 2026-11-10): each trigger is a
// pollSnapshot over that one request, `added` only.
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
