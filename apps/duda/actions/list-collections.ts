import type { ActionDefinition } from "@w6w/types";
import { DudaClient, seg } from "../lib/client.ts";

/**
 * `GET /api/sites/multiscreen/{site_name}/collection` — "List Collections".
 *
 * A **bare array** — the Collections half of Duda's docs is a separate OpenAPI
 * document (3.1.0) that does not use the `PaginationResultRDT` envelope the
 * Partner API document does.
 *
 * Each collection carries its `name`, its `item_count`, the `fields` it is
 * made of (`{ name, type, multi_select_options }`) and its `values` — the rows
 * themselves, each `{ id, page_item_url, data }`. So listing collections is
 * also how rows are read; there is no separate list-rows call.
 *
 * `regular_page_bindable` and `customer_lock` describe what the collection may
 * be bound to and whether a customer can edit it, and `base_refresh_interval`
 * is the ISO-8601 duration an externally-backed collection is refreshed on.
 */
const listCollections: ActionDefinition<{ siteName: string }> = {
  key: "list-collections",
  type: "read",
  resource: "collection",
  title: "List Collections",
  description:
    "List the collections (structured-data tables) on a site, including each one's fields and " +
    "rows.",
  params: [
    {
      key: "siteName",
      label: "Site name",
      type: "string",
      required: true,
      hint: "Duda's site alias (`site_name`).",
    },
  ],
  output: [
    {
      key: "[]",
      type: "array",
      label: "Collections — a bare array of `{ name, item_count, fields, values }`",
    },
  ],

  execute(input, ctx) {
    return new DudaClient(ctx).request(
      `/api/sites/multiscreen/${seg(input.siteName)}/collection`,
    );
  },
};

export default listCollections;
