import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newProduct from "../../triggers/new-product.ts";
import newOrUpdatedProduct from "../../triggers/new-or-updated-product.ts";
import newOrder from "../../triggers/new-order.ts";
import newOrUpdatedOrder from "../../triggers/new-or-updated-order.ts";
import newSite from "../../triggers/new-site.ts";
import newOrUpdatedSite from "../../triggers/new-or-updated-site.ts";
import newDataItem from "../../triggers/new-data-item.ts";
import newOrUpdatedDataItem from "../../triggers/new-or-updated-data-item.ts";
import newCollection from "../../triggers/new-collection.ts";

const base = { subscriptionId: "sub-1" };
const WIX = "https://www.wixapis.com";
const sort = (fieldName: string) => [{ fieldName, order: "DESC" }];

interface Case {
  name: string;
  // deno-lint-ignore no-explicit-any
  trigger: any;
  params: Record<string, unknown>;
  listKey: string;
  url: string;
  body: unknown;
  /** Build one record; `stamp` is its update stamp. */
  rec: (id: string, stamp: string) => unknown;
  /** Present only for new-or-updated triggers: the edited record keeps its id, changes its stamp. */
  updated: boolean;
}

const stampOf = (v: string) => `2026-11-${v}T10:00:00.000Z`;

const cases: Case[] = [
  {
    name: "new-product",
    trigger: newProduct,
    params: {},
    listKey: "products",
    url: `${WIX}/stores/v3/products/query`,
    body: { query: { sort: sort("createdDate"), cursorPaging: { limit: 50 } } },
    rec: (id, s) => ({ id, updatedDate: s }),
    updated: false,
  },
  {
    name: "new-or-updated-product",
    trigger: newOrUpdatedProduct,
    params: {},
    listKey: "products",
    url: `${WIX}/stores/v3/products/query`,
    body: { query: { sort: sort("updatedDate"), cursorPaging: { limit: 50 } } },
    rec: (id, s) => ({ id, updatedDate: s }),
    updated: true,
  },
  {
    name: "new-order",
    trigger: newOrder,
    params: {},
    listKey: "orders",
    url: `${WIX}/ecom/v1/orders/search`,
    body: { search: { sort: sort("createdDate"), cursorPaging: { limit: 50 } } },
    rec: (id, s) => ({ id, updatedDate: s }),
    updated: false,
  },
  {
    name: "new-or-updated-order",
    trigger: newOrUpdatedOrder,
    params: {},
    listKey: "orders",
    url: `${WIX}/ecom/v1/orders/search`,
    body: { search: { sort: sort("updatedDate"), cursorPaging: { limit: 50 } } },
    rec: (id, s) => ({ id, updatedDate: s }),
    updated: true,
  },
  {
    name: "new-site",
    trigger: newSite,
    params: {},
    listKey: "sites",
    url: `${WIX}/site-list/v2/sites/query`,
    body: { query: { sort: sort("createdDate"), cursorPaging: { limit: 50 } } },
    rec: (id, s) => ({ id, updatedDate: s }),
    updated: false,
  },
  {
    name: "new-or-updated-site",
    trigger: newOrUpdatedSite,
    params: {},
    listKey: "sites",
    url: `${WIX}/site-list/v2/sites/query`,
    body: { query: { sort: sort("updatedDate"), cursorPaging: { limit: 50 } } },
    rec: (id, s) => ({ id, updatedDate: s }),
    updated: true,
  },
  {
    name: "new-data-item",
    trigger: newDataItem,
    params: { dataCollectionId: "Cities" },
    listKey: "dataItems",
    url: `${WIX}/wix-data/v2/items/query`,
    body: {
      dataCollectionId: "Cities",
      query: { sort: sort("_createdDate"), paging: { limit: 50, offset: 0 } },
    },
    rec: (id, s) => ({ id, data: { _updatedDate: { $date: s } } }),
    updated: false,
  },
  {
    name: "new-or-updated-data-item",
    trigger: newOrUpdatedDataItem,
    params: { dataCollectionId: "Cities" },
    listKey: "dataItems",
    url: `${WIX}/wix-data/v2/items/query`,
    body: {
      dataCollectionId: "Cities",
      query: { sort: sort("_updatedDate"), paging: { limit: 50, offset: 0 } },
    },
    rec: (id, s) => ({ id, data: { _updatedDate: { $date: s } } }),
    updated: true,
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const list = (...recs: unknown[]) => [{ body: { [c.listKey]: recs } }];
    const input = (state: unknown) => ({ ...base, params: c.params, state });

    test("seeds without emitting and sends the literal sorted request", async () => {
      const m = mockCtx(list(c.rec("a", stampOf("01"))));
      const seeded = await c.trigger.poll!(input({}), m.ctx);
      assertEquals(seeded.events, []);
      assertEquals(seeded.nextState.seeded, true);
      assertEquals(m.calls[0].method, "POST");
      assertEquals(m.calls[0].url, c.url);
      assertEquals(JSON.parse(m.calls[0].body!), c.body);
    });

    test("emits the new record once; a retry is identical", async () => {
      const seeded = await c.trigger.poll!(
        input({}),
        mockCtx(list(c.rec("a", stampOf("01")))).ctx,
      );
      const fresh = c.rec("b", stampOf("02"));
      const responses = () => list(fresh, c.rec("a", stampOf("01")));
      const one = await c.trigger.poll!(input(seeded.nextState), mockCtx(responses()).ctx);
      const two = await c.trigger.poll!(input(seeded.nextState), mockCtx(responses()).ctx);
      assertEquals(one.events, [fresh]);
      assertEquals(one, two);
    });

    if (c.updated) {
      test("an edit to an old record is a new event", async () => {
        const seeded = await c.trigger.poll!(
          input({}),
          mockCtx(list(c.rec("a", stampOf("01")))).ctx,
        );
        const edited = c.rec("a", stampOf("05"));
        const next = await c.trigger.poll!(
          input(seeded.nextState),
          mockCtx(list(edited)).ctx,
        );
        assertEquals(next.events, [edited]);
      });
    }
  });
}

describe("new-collection (snapshot)", () => {
  const cols = (n: number, from = 0) => ({
    collections: Array.from({ length: n }, (_, i) => ({ id: `c${from + i}` })),
  });
  test("seeds, reads every page by offset, emits only the added collection", async () => {
    const m = mockCtx([{ body: cols(50) }, { body: cols(1, 50) }]);
    const seeded = await newCollection.poll!({ ...base, params: {}, state: {} }, m.ctx);
    assertEquals(seeded.events, []);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(
      m.calls[0].url,
      `${WIX}/wix-data/v2/collections?paging.limit=50&paging.offset=0`,
    );
    assertEquals(
      m.calls[1].url,
      `${WIX}/wix-data/v2/collections?paging.limit=50&paging.offset=50`,
    );
    const next = () => [{ body: cols(50) }, { body: cols(2, 50) }];
    const a = await newCollection.poll!(
      { ...base, params: {}, state: seeded.nextState },
      mockCtx(next()).ctx,
    );
    const b = await newCollection.poll!(
      { ...base, params: {}, state: seeded.nextState },
      mockCtx(next()).ctx,
    );
    assertEquals(a.events, [{ id: "c51" }]);
    assertEquals(a, b);
  });
});
