import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listProducts from "../actions/list-products.ts";

/** Page size the action allows (max 100) and the most pages one check walks (5000 products). */
const PAGE = 100;
const MAX_PAGES = 50;

/**
 * `list-products`: `GET /sites/{site_id}/products?limit&offset` takes no sort or created-since
 * argument (https://developers.webflow.com/data/reference/ecommerce/products/list, verified
 * 2026-11-10), so "newest first" is not available. The check therefore walks every page
 * (`pagination.total`) and snapshots the product ids, emitting ids not seen before. A store above
 * 5000 products fails the check with an error naming the cap rather than silently missing some.
 * A product listed twice because the catalog shifted between pages is counted once.
 */
const trigger: TriggerDefinition<{ siteId: string }> = {
  key: "new-product",
  title: "New Ecommerce Product",
  description:
    "The run gets each product newly added to the chosen Webflow Ecommerce site, with its SKUs (edits and removals are ignored; stores of up to 5000 products).",
  params: [{ key: "siteId", label: "Site ID", type: "string", required: true }],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Product ID" },
    { key: "values", type: "object", label: "Product and SKUs" },
  ],
  sample: {
    change: "added",
    key: "5e8518516e147040726cc415",
    values: {
      product: { id: "5e8518516e147040726cc415", fieldData: { name: "Colorful T-shirt" } },
      skus: [],
    },
  },
  minIntervalMs: 900_000,
  async poll({ params, state }, ctx) {
    type Product = { product?: { id?: string }; [key: string]: unknown };
    const rows = new Map<string, Product>();
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await listProducts.execute(
        { siteId: params.siteId, limit: PAGE, offset: page * PAGE },
        ctx,
      ) as { items?: Product[]; pagination?: { total?: number } };
      const items = res.items ?? [];
      for (const item of items) {
        const id = item.product?.id;
        if (id) rows.set(String(id), item);
      }
      const total = Number(res.pagination?.total ?? 0);
      if (items.length === 0 || (page + 1) * PAGE >= total) break;
      if (page === MAX_PAGES - 1) {
        throw new Error(`Webflow store has more than ${MAX_PAGES * PAGE} products (the cap).`);
      }
    }
    return await pollSnapshot({
      state,
      rows: [...rows].map(([key, values]) => ({ key, values })),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
