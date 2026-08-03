import type { ActionDefinition } from "@w6w/types";
import {
  CloseClient,
  type CloseList,
  compact,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  leadId?: string;
  userId?: string;
  statusId?: string;
  statusType?: string;
  dateCreatedGte?: string;
  dateCreatedLte?: string;
  orderBy?: string;
}

/**
 * `GET /opportunity/` — offset-paginated list of Opportunities.
 *
 * This endpoint has by far the richest documented filter set in the API — around
 * forty query parameters, including `__gte`/`__lte`/`__gt`/`__lt` suffixed
 * variants of `date_won`, `date_created` and `date_updated`, plus `__in` list
 * variants of most id and status filters.
 *
 * Exposed here is the subset that answers the questions a pipeline workflow
 * actually asks — whose deals, on which account, at what stage, created when —
 * rather than all forty. `status_type` is the one to reach for when you want
 * "all open deals" regardless of how the organization has named its stages,
 * since it groups the custom statuses into Close's fixed `active` / `won` /
 * `lost` trichotomy.
 */
const listOpportunities: ActionDefinition<Input> = {
  key: "list-opportunities",
  type: "search",
  resource: "opportunity",
  title: "List Opportunities",
  description:
    "List Opportunities, filtered by lead, owner, status or creation date. Use `statusType` for " +
    "the stage-name-independent open/won/lost split.",
  params: [
    { key: "leadId", label: "Lead ID", type: "string", placeholder: "lead_..." },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      placeholder: "user_...",
      hint: "The Opportunity's owner. Get ids from the List Users action.",
    },
    {
      key: "statusId",
      label: "Status ID",
      type: "string",
      placeholder: "stat_...",
      hint: "A specific pipeline stage, from the List Statuses action.",
    },
    {
      key: "statusType",
      label: "Status type",
      type: "select",
      options: [
        { value: "active", label: "Active (open)" },
        { value: "won", label: "Won" },
        { value: "lost", label: "Lost" },
      ],
      hint: "Close's fixed grouping over whatever the organization has named its stages.",
    },
    {
      key: "dateCreatedGte",
      label: "Created on or after",
      type: "datetime",
      hint: "Maps to `date_created__gte`.",
    },
    {
      key: "dateCreatedLte",
      label: "Created on or before",
      type: "datetime",
      hint: "Maps to `date_created__lte`.",
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      placeholder: "-date_created",
      hint: "Field name to sort by (`_order_by`). Prefix with `-` to reverse.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new CloseClient(ctx).request<CloseList>("/opportunity/", {
      query: compact({
        ...pageQuery(input),
        lead_id: input.leadId,
        user_id: input.userId,
        status_id: input.statusId,
        status_type: input.statusType,
        date_created__gte: input.dateCreatedGte,
        date_created__lte: input.dateCreatedLte,
        _order_by: input.orderBy,
      }),
    });
  },
};

export default listOpportunities;
