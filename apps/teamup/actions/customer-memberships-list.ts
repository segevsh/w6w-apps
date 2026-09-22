/**
 * `GET /api/v2/customer_memberships` — the memberships customers hold.
 *
 * This is the instance side: one row is one customer holding one plan
 * (`memberships-list` is the product side). A workflow that needs "whose
 * membership has expired" or "who is on hold" filters here instead of joining
 * two lists itself.
 *
 * The date filters come in pairs (`start_date_*`, `expiration_date_*`, and the
 * hold window's `active_hold_start_date_*`/`active_hold_end_date_*`), and
 * `has_expiration_date`/`has_active_hold` are the boolean shortcuts for the
 * same questions — a plan whose `begin_on_first_registration` is on genuinely
 * has no expiration date until it is first used, which is why the boolean
 * exists rather than an empty-date filter.
 *
 * `owned_or_shared_with_customer` and `owned_or_shared_with_family` take a
 * customer (or family) id and cover sharing: a family account can hold a
 * membership one member bought for another.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { commonQuery, type ListInput, listParams, paginationQuery } from "../lib/params.ts";
import { pageOutput } from "../lib/outputs.ts";

interface Input extends ListInput {
  customer?: number;
  membership?: number;
  membership_type?: string;
  status?: string;
  ids?: string;
  sort?: string;
  start_date_gte?: string;
  start_date_lte?: string;
  expiration_date_gte?: string;
  expiration_date_lte?: string;
  has_expiration_date?: boolean;
  has_active_hold?: boolean;
  active_hold_start_date_gte?: string;
  active_hold_start_date_lte?: string;
  active_hold_end_date_gte?: string;
  active_hold_end_date_lte?: string;
  owned_or_shared_with_customer?: number;
  owned_or_shared_with_family?: number;
}

const action: ActionDefinition<Input> = {
  key: "customer-memberships-list",
  type: "search",
  resource: "customer-membership",
  title: "List Customer Memberships",
  description:
    "List the memberships customers hold, filtered by customer, plan, status, dates and holds (GET " +
    "/api/v2/customer_memberships).",
  params: [
    {
      key: "customer",
      label: "Customer ID",
      type: "number",
      validation: { integer: true },
      hint: "Memberships this customer holds.",
    },
    {
      key: "membership",
      label: "Membership ID",
      type: "number",
      validation: { integer: true },
      hint: "Instances of this plan.",
    },
    {
      key: "membership_type",
      label: "Membership type",
      type: "string",
      hint: "pack, recurring_plan or prepaid_plan.",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "active, hold, completed or cancelled.",
    },
    {
      key: "ids",
      label: "Customer membership IDs",
      type: "string",
      hint: "Comma-separated ids — hydrate a known set.",
    },
    { key: "sort", label: "Sort", type: "string", hint: "The server-side sort order." },
    {
      key: "start_date_gte",
      label: "Starts at or after",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "start_date_lte",
      label: "Starts at or before",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "expiration_date_gte",
      label: "Expires at or after",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "expiration_date_lte",
      label: "Expires at or before",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "has_expiration_date",
      label: "Has an expiration date",
      type: "boolean",
      hint: "Exclude plans that only expire once used.",
    },
    {
      key: "has_active_hold",
      label: "Has an active hold",
      type: "boolean",
      hint: "Only memberships currently frozen by a hold.",
    },
    {
      key: "active_hold_start_date_gte",
      label: "Hold starts at or after",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "active_hold_start_date_lte",
      label: "Hold starts at or before",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "active_hold_end_date_gte",
      label: "Hold ends at or after",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "active_hold_end_date_lte",
      label: "Hold ends at or before",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "owned_or_shared_with_customer",
      label: "Owned or shared with customer",
      type: "number",
      validation: { integer: true },
      hint: "Customer id — memberships that customer owns or that are shared with them.",
    },
    {
      key: "owned_or_shared_with_family",
      label: "Owned or shared with family",
      type: "number",
      validation: { integer: true },
      hint: "Family id — the same question at family-account level.",
    },
    ...listParams(),
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request("/customer_memberships", {
      query: {
        ...paginationQuery(input),
        customer: input.customer,
        membership: input.membership,
        membership_type: input.membership_type,
        status: input.status,
        ids: input.ids,
        sort: input.sort,
        start_date_gte: input.start_date_gte,
        start_date_lte: input.start_date_lte,
        expiration_date_gte: input.expiration_date_gte,
        expiration_date_lte: input.expiration_date_lte,
        has_expiration_date: input.has_expiration_date,
        has_active_hold: input.has_active_hold,
        active_hold_start_date_gte: input.active_hold_start_date_gte,
        active_hold_start_date_lte: input.active_hold_start_date_lte,
        active_hold_end_date_gte: input.active_hold_end_date_gte,
        active_hold_end_date_lte: input.active_hold_end_date_lte,
        owned_or_shared_with_customer: input.owned_or_shared_with_customer,
        owned_or_shared_with_family: input.owned_or_shared_with_family,
        ...commonQuery(input),
      },
      providerId: input.providerId,
    });
  },
};

export default action;
