import type { TriggerDefinition } from "@w6w/types";
import priceListRecordList from "../actions/price-list-record-list.ts";
import { pollWindow, toMs } from "../lib/window.ts";

// `GET /v3/pricelists/{price_list_id}/records` documents `date_modified:min`, "Filter results to
// those modified on or after this date", and a `date_modified` on each record
// (https://docs.bigcommerce.com/developer/api-reference/rest/admin/management/price-lists/price-lists-records/get-price-list-records).
// A record has no id of its own: it is keyed by price list, variant and currency.
const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;
const SEEN_WINDOW = 2000;
export const clock = { now: (): number => Date.now() };

interface PriceRecord {
  price_list_id?: number;
  variant_id?: number;
  currency?: string;
  date_modified?: string;
}

const trigger: TriggerDefinition = {
  key: "new-or-updated-price-list-record",
  title: "New or Updated Price List Record",
  description:
    "The run gets each price in one price list (per variant and currency) that is added or changed since the previous check.",
  params: [{
    key: "priceListId",
    label: "Price list ID",
    type: "number",
    required: true,
    validation: { integer: true, min: 1 },
    hint: "The price list to watch.",
  }],
  output: [
    { key: "price_list_id", type: "number", label: "Price list ID" },
    { key: "variant_id", type: "number", label: "Variant ID" },
    { key: "product_id", type: "number", label: "Product ID" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "price", type: "number", label: "Price" },
    { key: "sale_price", type: "number", label: "Sale price" },
    { key: "date_modified", type: "string", label: "Modified at" },
  ],
  sample: {
    price_list_id: 3,
    variant_id: 118,
    product_id: 77,
    currency: "usd",
    price: 19.5,
    sale_price: null,
    date_modified: "2026-11-10T10:00:00+00:00",
  },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    const priceListId = Number((params as { priceListId?: unknown }).priceListId);
    // A window longer than MAX_PAGES pages is resumed on the next check and the cursor moves only
    // once it drains (brief 9.8); the seed stores `floor = now` and emits nothing (brief 9.9).
    return pollWindow<PriceRecord, number>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      clientSince: true,
      idOf: (r) =>
        `${r.price_list_id ?? priceListId}:${r.variant_id ?? ""}:${r.currency ?? ""}:${
          r.date_modified ?? ""
        }`,
      tsOf: (r) => toMs(r.date_modified),
      async load(sinceMs, pos) {
        const page = pos ?? 1;
        const res = await priceListRecordList.execute({
          priceListId,
          modifiedFrom: new Date(sinceMs).toISOString().slice(0, 19) + "Z",
          limit: PAGE_SIZE,
          page,
        }, ctx) as { data?: PriceRecord[] };
        const items = Array.isArray(res.data) ? res.data : [];
        return { items, next: items.length >= PAGE_SIZE ? page + 1 : undefined };
      },
    });
  },
};

export default trigger;
