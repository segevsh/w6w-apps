import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient, nextCursor, type PagedResponse } from "../lib/client.ts";

interface Input {
  afterDate?: string;
  beforeDate?: string;
  limit?: number;
  cursor?: string;
}

interface Result extends PagedResponse {
  campaigns?: unknown[];
  next_cursor?: string;
}

/**
 * `GET /v3/emails` — one page of email campaigns.
 *
 * Two things about this collection are easy to get wrong:
 *
 *   - It includes **deleted** campaigns (`current_status: "Removed"`) by
 *     default and offers no status filter to exclude them.
 *   - `after_date` / `before_date` filter on `updated_at`, not on creation or
 *     send date. The vendor states outright that filtering by creation date is
 *     not supported.
 *
 * Rows here carry no campaign *activities*. Those come from
 * `GET /v3/emails/{campaign_id}` (Get Email Campaign), which is what maps a
 * campaign to the `campaign_activity_id` the content and scheduling endpoints
 * need.
 */
const listEmailCampaigns: ActionDefinition<Input> = {
  key: "list-email-campaigns",
  type: "read",
  resource: "campaign",
  title: "List Email Campaigns",
  description:
    "List email campaigns, filtered on `updated_at`. Includes deleted campaigns — the API has no status filter.",
  params: [
    {
      key: "afterDate",
      label: "Updated after",
      type: "string",
      hint: "ISO-8601. Filters on `updated_at`, not creation or send date.",
    },
    {
      key: "beforeDate",
      label: "Updated before",
      type: "string",
      hint: "ISO-8601. Filters on `updated_at`.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { min: 1, max: 500, integer: true },
    },
    { key: "cursor", label: "Cursor", type: "string" },
  ],
  output: [
    { key: "campaigns", type: "array", label: "Email campaigns" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page" },
    { key: "_links", type: "object", label: "Paging links" },
  ],

  async execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    const body = await client.request<Result>("/emails", {
      query: {
        after_date: input.afterDate,
        before_date: input.beforeDate,
        limit: input.limit ?? 50,
        cursor: input.cursor,
      },
    });
    return { ...body, next_cursor: nextCursor(body?._links) };
  },
};

export default listEmailCampaigns;
