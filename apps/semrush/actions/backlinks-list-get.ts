import type { ActionDefinition } from "@w6w/types";
import { SemrushClient } from "../lib/client.ts";
import {
  directionParam,
  fieldsParam,
  filterParam,
  limitParam,
  offsetParam,
  orderByParam,
  SCOPE_FULL,
  scopeParam,
} from "../lib/params.ts";

/**
 * `GET /apis/v4/backlinks/v1/links` — the individual backlinks pointing at a target.
 *
 * The raw rows behind the overview, one per link. `data` is an array of backlink
 * objects; the fields confirmed against the v4 reference are `anchor`,
 * `domain_score`, `external_links_count`, `first_seen_at`, `image_alt`,
 * `image_url`, `internal_links_count`, `ip_address`, `is_form`, `is_frame`,
 * `is_image`, `is_lost`, `is_new`, `is_nofollow`, `is_sitewide_main`,
 * `is_sponsored`, `is_ugc`, `lang`, `last_seen_at`, `page_score`,
 * `redirect_url` and `response_code`. The vendor documents more columns than
 * the v4 pages enumerate, so the list above is only what could be confirmed —
 * it is not asserted to be exhaustive, and `fields` accepts any column the
 * report itself publishes.
 *
 * `order_by` is left without a default here: the vendor applies its own, and
 * the sortable set is the row's own columns.
 */
interface Input {
  url: string;
  scope: string;
  fields?: string[];
  order_by?: string;
  direction?: string;
  limit?: number;
  offset?: number;
  filter?: string;
}

const backlinksListGet: ActionDefinition<Input> = {
  key: "backlinks-list-get",
  type: "read",
  resource: "backlinks",
  title: "List Backlinks",
  description: "List the individual backlinks pointing at a target, with sorting and paging.",
  params: [
    {
      key: "url",
      label: "Target",
      type: "string",
      required: true,
      placeholder: "example.com",
      hint: "A domain, subdomain, subfolder or exact URL — `scope` says which one is meant.",
    },
    scopeParam(SCOPE_FULL),
    fieldsParam,
    orderByParam(),
    directionParam,
    limitParam(100),
    offsetParam,
    filterParam,
  ],
  output: [{ key: "data", type: "array", label: "Backlinks, one row per link" }],

  async execute(input, ctx) {
    const data = await new SemrushClient(ctx)
      .data<unknown[]>("/backlinks/v1/links", {
        query: {
          url: input.url,
          scope: input.scope,
          fields: input.fields,
          order_by: input.order_by,
          direction: input.direction,
          limit: input.limit,
          offset: input.offset,
          filter: input.filter,
        },
      });
    return { data: data ?? [] };
  },
};

export default backlinksListGet;
