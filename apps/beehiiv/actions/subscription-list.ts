import type { ActionDefinition } from "@w6w/types";
import { BeehiivClient, compact, toList } from "../lib/client.ts";
import {
  bracketQuery,
  cursorParam,
  directionParam,
  offsetPaginationParams,
  publicationIdParam,
} from "../lib/params.ts";

interface Input {
  publicationId: string;
  expand?: string;
  status?: "validating" | "invalid" | "pending" | "active" | "inactive" | "all";
  tier?: "free" | "premium" | "all";
  premiumTiers?: string;
  premiumTierIds?: string;
  limit?: number;
  cursor?: string;
  page?: number;
  email?: string;
  direction?: "asc" | "desc";
  creationDate?: string;
}

/**
 * `GET /publications/{publicationId}/subscriptions`.
 *
 * The **only** list endpoint in this API with cursor pagination — see
 * {@link cursorParam}. Pass `cursor` (from a previous call's `next_cursor`
 * output) for a list that may run past beehiiv's 100-page offset ceiling.
 */
const subscriptionList: ActionDefinition<Input> = {
  key: "subscription-list",
  type: "read",
  resource: "subscription",
  title: "List Subscriptions",
  description: "Retrieve all subscriptions belonging to a specific publication.",
  params: [
    publicationIdParam,
    {
      key: "expand",
      label: "Expand",
      type: "string",
      hint: "Comma-separated: `stats`, `custom_fields`, `referrals`, `newsletter_lists`.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "validating", label: "Validating" },
        { value: "invalid", label: "Invalid" },
        { value: "pending", label: "Pending (double opt-in)" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive (unsubscribed)" },
        { value: "all", label: "All" },
      ],
    },
    {
      key: "tier",
      label: "Tier",
      type: "select",
      options: [
        { value: "free", label: "Free" },
        { value: "premium", label: "Premium" },
        { value: "all", label: "All" },
      ],
    },
    { key: "premiumTiers", label: "Premium tiers", type: "string", hint: "Comma-separated names." },
    {
      key: "premiumTierIds",
      label: "Premium tier IDs",
      type: "string",
      hint: "Comma-separated IDs.",
    },
    ...offsetPaginationParams(),
    cursorParam,
    { key: "email", label: "Email", type: "string", hint: "Exact match, case-insensitive." },
    directionParam,
    {
      key: "creationDate",
      label: "Creation date",
      type: "string",
      placeholder: "2026/09/29",
      hint: "Format YYYY/MM/DD.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "created", type: "number", label: "Created (Unix seconds)" },
    { key: "next_cursor", type: "string", label: "Pass as `cursor` to fetch the next page" },
    { key: "has_more", type: "boolean", label: "Whether more pages exist (cursor mode)" },
  ],

  async execute(input, ctx) {
    return await new BeehiivClient(ctx).cursorList(
      `/publications/${encodeURIComponent(input.publicationId)}/subscriptions`,
      {
        query: {
          ...compact({
            status: input.status,
            tier: input.tier,
            limit: input.limit,
            cursor: input.cursor,
            page: input.cursor ? undefined : input.page,
            email: input.email,
            direction: input.direction,
            creation_date: input.creationDate,
          }),
          ...bracketQuery("expand", toList(input.expand)),
          ...bracketQuery("premium_tiers", toList(input.premiumTiers)),
          ...bracketQuery("premium_tier_ids", toList(input.premiumTierIds)),
        },
      },
    );
  },
};

export default subscriptionList;
