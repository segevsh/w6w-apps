import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newOrder from "../../triggers/new-order.ts";
import newOrderItem from "../../triggers/new-order-item.ts";
import newPurchase from "../../triggers/new-purchase.ts";
import newFormSubmission from "../../triggers/new-form-submission.ts";
import newContactNote from "../../triggers/new-contact-note.ts";
import newOrUpdatedPurchase from "../../triggers/new-or-updated-purchase.ts";
import newOrUpdatedContactNote from "../../triggers/new-or-updated-contact-note.ts";
import newOffer from "../../triggers/new-offer.ts";
import newProduct from "../../triggers/new-product.ts";
import newCourse from "../../triggers/new-course.ts";
import newForm from "../../triggers/new-form.ts";
import newContactTag from "../../triggers/new-contact-tag.ts";
import newContactOffer from "../../triggers/new-contact-offer.ts";
import newOfferProduct from "../../triggers/new-offer-product.ts";

const base = "https://api.kajabi.com/v1/";
const rows = (items: unknown[]) => ({ body: { data: items } });
const input = (params: Record<string, unknown>, state: unknown) => ({ params, state }) as never;

const newestCases = [
  [
    "new-customer",
    newCustomer,
    { siteId: "site-1" },
    base +
    "customers?filter%5Bsite_id%5D=site-1&sort=-created_at&page%5Bnumber%5D=1&page%5Bsize%5D=100",
  ],
  [
    "new-order",
    newOrder,
    { siteId: "site-1" },
    base +
    "orders?filter%5Bsite_id%5D=site-1&sort=-created_at&page%5Bnumber%5D=1&page%5Bsize%5D=100",
  ],
  [
    "new-order-item",
    newOrderItem,
    { siteId: "site-1" },
    base +
    "order_items?filter%5Bsite_id%5D=site-1&sort=-created_at&page%5Bnumber%5D=1&page%5Bsize%5D=100",
  ],
  [
    "new-purchase",
    newPurchase,
    { siteId: "site-1" },
    base +
    "purchases?filter%5Bsite_id%5D=site-1&sort=-created_at&page%5Bnumber%5D=1&page%5Bsize%5D=100",
  ],
  [
    "new-form-submission",
    newFormSubmission,
    { siteId: "site-1", formId: "form-9" },
    base +
    "form_submissions?filter%5Bsite_id%5D=site-1&filter%5Bform_id%5D=form-9&sort=-created_at&page%5Bnumber%5D=1&page%5Bsize%5D=100",
  ],
  [
    "new-contact-note",
    newContactNote,
    { siteId: "site-1", contactId: "contact-7" },
    base +
    "contact_notes?filter%5Bcontact_id%5D=contact-7&filter%5Bsite_id%5D=site-1&sort=-created_at&page%5Bnumber%5D=1&page%5Bsize%5D=100",
  ],
] as const;

for (const [name, trigger, params, url] of newestCases) {
  test(`${name} seeds, emits only the new record, retries identically, and requests the literal list`, async () => {
    const old = { id: "old", type: "x" }, fresh = { id: "fresh", type: "x" };
    const seed = mockCtx([rows([old])]);
    const seeded = await trigger.poll!(input(params, {}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
    const next = () => mockCtx([rows([fresh, old])]).ctx;
    const result = await trigger.poll!(input(params, seeded.nextState), next());
    assertEquals(result.events, [fresh]);
    assertEquals(await trigger.poll!(input(params, seeded.nextState), next()), result);
  });
}

const updatedCases = [
  [
    "new-or-updated-purchase",
    newOrUpdatedPurchase,
    { siteId: "site-1" },
    base +
    "purchases?filter%5Bsite_id%5D=site-1&sort=-updated_at&page%5Bnumber%5D=1&page%5Bsize%5D=100",
  ],
  [
    "new-or-updated-contact-note",
    newOrUpdatedContactNote,
    { siteId: "site-1", contactId: "contact-7" },
    base +
    "contact_notes?filter%5Bcontact_id%5D=contact-7&filter%5Bsite_id%5D=site-1&sort=-updated_at&page%5Bnumber%5D=1&page%5Bsize%5D=100",
  ],
] as const;

for (const [name, trigger, params, url] of updatedCases) {
  test(`${name} emits an edited record and requests updated_at descending`, async () => {
    const stamp = (id: string, at: string) => ({ id, attributes: { updated_at: at } });
    const old = stamp("old", "2026-11-10T09:00:00Z");
    const edited = stamp("old", "2026-11-10T10:00:00Z");
    const fresh = stamp("fresh", "2026-11-10T11:00:00Z");
    const seed = mockCtx([rows([old])]);
    const seeded = await trigger.poll!(input(params, {}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
    const next = () => mockCtx([rows([fresh, edited])]).ctx;
    const result = await trigger.poll!(input(params, seeded.nextState), next());
    assertEquals(result.events, [edited, fresh]);
    assertEquals(await trigger.poll!(input(params, seeded.nextState), next()), result);
  });
}

const snapshotCases = [
  [
    "new-offer",
    newOffer,
    { siteId: "site-1" },
    base + "offers?filter%5Bsite_id%5D=site-1&sort=title&page%5Bnumber%5D=1&page%5Bsize%5D=100",
  ],
  [
    "new-product",
    newProduct,
    { siteId: "site-1" },
    base + "products?filter%5Bsite_id%5D=site-1&sort=title&page%5Bnumber%5D=1&page%5Bsize%5D=100",
  ],
  [
    "new-course",
    newCourse,
    { siteId: "site-1" },
    base + "courses?filter%5Bsite_id%5D=site-1&sort=title&page%5Bnumber%5D=1&page%5Bsize%5D=100",
  ],
  [
    "new-form",
    newForm,
    { siteId: "site-1" },
    base + "forms?filter%5Bsite_id%5D=site-1&sort=title&page%5Bnumber%5D=1&page%5Bsize%5D=100",
  ],
  [
    "new-contact-tag",
    newContactTag,
    { contactId: "contact-7" },
    base + "contacts/contact-7/relationships/tags",
  ],
  [
    "new-contact-offer",
    newContactOffer,
    { contactId: "contact-7" },
    base + "contacts/contact-7/relationships/offers",
  ],
  [
    "new-offer-product",
    newOfferProduct,
    { offerId: "offer-3" },
    base + "offers/offer-3/relationships/products",
  ],
] as const;

for (const [name, trigger, params, url] of snapshotCases) {
  test(`${name} seeds, emits only an added record, retries identically, and requests the literal list`, async () => {
    const old = { id: "old", type: "x" }, fresh = { id: "fresh", type: "x" };
    const seed = mockCtx([rows([old])]);
    const seeded = await trigger.poll!(input(params, {}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
    const next = () => mockCtx([rows([old, fresh])]).ctx;
    const result = await trigger.poll!(input(params, seeded.nextState), next());
    assertEquals(result.events, [fresh]);
    assertEquals(await trigger.poll!(input(params, seeded.nextState), next()), result);
    const gone = await trigger.poll!(input(params, seeded.nextState), mockCtx([rows([])]).ctx);
    assertEquals(gone.events, []);
  });
}

test("new-offer walks a second page when the first is full and stops at the first short page", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: `o${i}` }));
  const mock = mockCtx([rows(full), rows([{ id: "last" }])]);
  const result = await newOffer.poll!(input({ siteId: "site-1" }, {}), mock.ctx);
  assertEquals(result.events, []);
  assertEquals(mock.calls.map((c) => c.url), [
    base + "offers?filter%5Bsite_id%5D=site-1&sort=title&page%5Bnumber%5D=1&page%5Bsize%5D=100",
    base + "offers?filter%5Bsite_id%5D=site-1&sort=title&page%5Bnumber%5D=2&page%5Bsize%5D=100",
  ]);
});

test("new-offer fails loudly instead of truncating a collection longer than five pages", async () => {
  const full = () => rows(Array.from({ length: 100 }, (_, i) => ({ id: `o${i}` })));
  const mock = mockCtx([full(), full(), full(), full(), full()]);
  let message = "";
  try {
    await newOffer.poll!(input({}, {}), mock.ctx);
  } catch (error) {
    message = (error as Error).message;
  }
  assertEquals(message.includes("more than 500 records"), true);
});

for (const [name, trigger, params] of snapshotCases) {
  test(`${name} stays silent for an edited row`, async () => {
    const seeded = await trigger.poll!(
      input(params, {}),
      mockCtx([rows([{ id: "a", type: "x", attributes: { title: "before" } }])]).ctx,
    );
    const edited = { id: "a", type: "x", attributes: { title: "after" } };
    const result = await trigger.poll!(
      input(params, seeded.nextState),
      mockCtx([rows([edited])]).ctx,
    );
    assertEquals(result.events, []);
  });
}
