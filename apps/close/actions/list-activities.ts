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
  contactId?: string;
  userId?: string;
  type?: string;
  dateCreatedGte?: string;
  dateCreatedLte?: string;
  orderBy?: string;
}

/**
 * `GET /activity/` — the unified activity feed across every type.
 *
 * This is the "what has happened" endpoint: calls, emails, notes, SMS, meetings
 * and status changes arrive interleaved in one stream, each tagged with its
 * `_type`. Close also publishes a per-type endpoint for each
 * (`/activity/call/`, `/activity/note/`, …); this action deliberately uses the
 * unified one because a timeline is the common need and `_type` narrows it
 * without a second action per kind.
 *
 * ## A real constraint, surfaced rather than buried
 *
 * Close documents that several filters "can only be used for listing activities
 * on a single lead (using the `lead_id` parameter)": `user_id`, `user_id__in`,
 * `contact_id`, `contact_id__in`, `_type` and `_type__in`. In other words
 * filtering by type or by person requires also pinning a `leadId`. That is
 * Close's rule, not this app's, and the param hints say so — otherwise a caller
 * gets a confusing empty or unfiltered result and no explanation.
 *
 * `_type` is left a free-text string rather than a `select` on purpose: besides
 * the built-in names (`Call`, `Email`, `Note`, `SMS`, `Meeting`, `Created`,
 * `LeadStatusChange`, `OpportunityStatusChange`, `TaskCompleted`), Close accepts
 * Custom Activity Type ids such as `actitype_1h5m6uHM9BZOpwVhyRJb4Y`, plus the
 * literal `Custom` for custom activities of any type. A fixed dropdown could not
 * express those and would quietly forbid a documented value.
 */
const listActivities: ActionDefinition<Input> = {
  key: "list-activities",
  type: "search",
  resource: "activity",
  title: "List Activities",
  description:
    "List activities — calls, emails, notes, SMS, meetings and status changes — as one " +
    "interleaved feed. Filtering by type, user or contact additionally requires a Lead ID.",
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      placeholder: "lead_...",
      hint: "Required if you want to filter by type, user or contact — Close only honours those " +
        "filters when the feed is pinned to a single Lead.",
    },
    {
      key: "type",
      label: "Activity type",
      type: "string",
      placeholder: "Call",
      hint: "`Call`, `Email`, `Note`, `SMS`, `Meeting`, `Created`, `LeadStatusChange`, " +
        "`OpportunityStatusChange`, `TaskCompleted`, a Custom Activity Type id " +
        "(`actitype_...`), or `Custom` for any custom activity. Needs `leadId` set.",
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      placeholder: "cont_...",
      hint: "Needs `leadId` set.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      placeholder: "user_...",
      hint: "Needs `leadId` set.",
    },
    {
      key: "dateCreatedGte",
      label: "Created on or after",
      type: "datetime",
      hint: "Maps to `date_created__gte`. Works without a Lead ID.",
    },
    {
      key: "dateCreatedLte",
      label: "Created on or before",
      type: "datetime",
      hint: "Maps to `date_created__lte`. Works without a Lead ID.",
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      placeholder: "-date_created",
      hint: "Field to sort by (`_order_by`). Prefix with `-` to reverse.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    if (input.type && !input.leadId) {
      ctx.log(
        "warn",
        "Close only honours the _type filter when lead_id is also set — returning the unfiltered feed",
        { type: input.type },
      );
    }
    return new CloseClient(ctx).request<CloseList>("/activity/", {
      query: compact({
        ...pageQuery(input),
        lead_id: input.leadId,
        contact_id: input.contactId,
        user_id: input.userId,
        _type: input.type,
        date_created__gte: input.dateCreatedGte,
        date_created__lte: input.dateCreatedLte,
        _order_by: input.orderBy,
      }),
    });
  },
};

export default listActivities;
