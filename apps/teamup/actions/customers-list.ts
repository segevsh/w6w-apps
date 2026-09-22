/**
 * `GET /api/v2/customers` — search the business's customers.
 *
 * This is the entry point to the member list: every other customer action
 * takes the `id` this returns, and the filters cover the questions a workflow
 * actually asks — who is on a given status, who matches a loose search, who is
 * part of a family account, and who holds anything right now.
 *
 * Two filters are worth understanding before using them:
 *
 *  - **`query` is one loose free-text search** across the customer's own
 *    details, while **`ids` is the exact match** for a set a previous step
 *    already resolved. Hydrating known ids is cheaper and more predictable
 *    than re-running a text search.
 *  - **`deleted` reaches soft-deleted customers.** A delete in TeamUp moves a
 *    record out of the working list rather than destroying it.
 *
 * `autocomplete` asks for the lighter rows a picker needs, `can_delete`
 * restricts to records the caller may remove, and `family` narrows to one
 * family account. Each is a documented filter, not a guess.
 *
 * The pagination envelope is returned verbatim: `results` holds Customer
 * objects (see `customers-get` for the full field list) and `count` is how a
 * caller decides whether another page exists.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { commonQuery, type ListInput, listParams, paginationQuery } from "../lib/params.ts";
import { pageOutput } from "../lib/outputs.ts";

interface Input extends ListInput {
  status?: string;
  query?: string;
  ids?: string;
  deleted?: boolean;
  age_gte?: number;
  age_lte?: number;
  family?: number;
  active_memberships?: boolean;
  autocomplete?: boolean;
  can_delete?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "customers-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description:
    "Search the business's customers by status, free text, ids, age and family or membership flags " +
    "(GET /api/v2/customers).",
  params: [
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "The customer's status, as TeamUp spells it.",
    },
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "One loose free-text search across the customer's details.",
    },
    {
      key: "ids",
      label: "Customer IDs",
      type: "string",
      hint: "Comma-separated customer ids — the exact match for a known set.",
    },
    {
      key: "deleted",
      label: "Include deleted",
      type: "boolean",
      hint: "Include customers TeamUp has deleted.",
    },
    { key: "age_gte", label: "Age at least", type: "number", hint: "Minimum age, in years." },
    { key: "age_lte", label: "Age at most", type: "number", hint: "Maximum age, in years." },
    {
      key: "family",
      label: "Family ID",
      type: "number",
      validation: { integer: true },
      hint: "Only customers in this family account.",
    },
    {
      key: "active_memberships",
      label: "With active memberships",
      type: "boolean",
      hint: "Only customers holding at least one active membership.",
    },
    {
      key: "autocomplete",
      label: "Autocomplete",
      type: "boolean",
      hint: "Return the lighter rows a picker needs.",
    },
    {
      key: "can_delete",
      label: "Deletable only",
      type: "boolean",
      hint: "Only customers this credential is allowed to delete.",
    },
    ...listParams(),
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request("/customers", {
      query: {
        ...paginationQuery(input),
        status: input.status,
        query: input.query,
        ids: input.ids,
        deleted: input.deleted,
        age_gte: input.age_gte,
        age_lte: input.age_lte,
        family: input.family,
        active_memberships: input.active_memberships,
        autocomplete: input.autocomplete,
        can_delete: input.can_delete,
        ...commonQuery(input),
      },
      providerId: input.providerId,
    });
  },
};

export default action;
