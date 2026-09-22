import type { ActionDefinition } from "@w6w/types";
import { csvParam, DudaClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  publishStatus?: string;
  sort?: string;
  direction?: string;
}

/**
 * `GET /api/sites/multiscreen` — "Get sites".
 *
 * Duda's own note on the endpoint: **sites with a status of 'In Planning' are
 * never returned**, so a site that exists in the editor can still be missing
 * from this list and from `get-site` until its plan is set.
 *
 * The response is the `PaginationResultRDTDudaOneSiteRetrieveRDT` envelope —
 * `{ limit, offset, total_responses, results: [...] }` — which is the shape the
 * auth probe also keys off, because it is the one envelope every list endpoint
 * in this API shares.
 */
const listSites: ActionDefinition<Input> = {
  key: "list-sites",
  type: "read",
  resource: "site",
  title: "List Sites",
  description:
    "List the sites under this account, newest first. Sites with a status of 'In Planning' are " +
    "never returned by Duda.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 75,
      hint: "Sites per page, 1–200. Duda's own default is 75.",
      validation: { min: 1, max: 200, integer: true },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      hint: "How many sites to skip — increase by `limit` to page through.",
      validation: { min: 0, integer: true },
    },
    {
      key: "publishStatus",
      label: "Publish status",
      type: "string",
      advanced: true,
      placeholder: "PUBLISHED,UNPUBLISHED",
      hint: "Comma-separated `NOT_PUBLISHED_YET`, `PUBLISHED` and/or `UNPUBLISHED`. Omit for all.",
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      advanced: true,
      default: "CREATION_DATE",
      options: [
        { value: "CREATION_DATE", label: "Creation date (default)" },
        { value: "LAST_PUBLISHED_DATE", label: "Last published date" },
      ],
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      advanced: true,
      default: "DESC",
      options: [
        { value: "DESC", label: "Descending (default)" },
        { value: "ASC", label: "Ascending" },
      ],
    },
  ],
  output: [
    { key: "results", type: "array", label: "Sites" },
    { key: "total_responses", type: "number", label: "Total sites matching the filters" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "offset", type: "number", label: "Offset" },
  ],

  execute(input, ctx) {
    return new DudaClient(ctx).request("/api/sites/multiscreen", {
      query: {
        limit: input.limit,
        offset: input.offset,
        publish_status: csvParam(input.publishStatus),
        sort: input.sort,
        direction: input.direction,
      },
    });
  },
};

export default listSites;
