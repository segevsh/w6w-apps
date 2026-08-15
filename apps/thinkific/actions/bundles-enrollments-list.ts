import type { ActionDefinition } from "@w6w/types";
import { queryFilters, ThinkificClient } from "../lib/client.ts";
import { idParam, type PaginationInput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input extends PaginationInput {
  id: string;
  userId?: number;
  email?: string;
  completed?: boolean;
  expired?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  createdOn?: string;
  createdOnOrAfter?: string;
  createdOnOrBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  updatedOn?: string;
  updatedOnOrAfter?: string;
  updatedOnOrBefore?: string;
}

const dateHint = "ISO 8601 date, e.g. 2026-08-15.";

/**
 * `GET /bundles/{id}/enrollments` — Enrollments in a Bundle.
 *
 * `completed` / `expired`: the OpenAPI document's own schema for these two
 * filters is internally inconsistent with the description right next to it —
 * `"Filter for only completed Bundle Enrollments when set to true"` (boolean
 * semantics) paired with `schema: {type: string, format: date-time}` (a date
 * value) — and inconsistent with the equivalent filters on plain
 * `GET /enrollments`, which are declared as plain booleans. That looks like a
 * copy-paste error in the vendor's own spec (the date-typed filters below it
 * were probably pasted over these two). This app follows the description —
 * and the sibling endpoint's precedent — and exposes both as booleans.
 */
const bundlesEnrollmentsList: ActionDefinition<Input> = {
  key: "bundles-enrollments-list",
  type: "read",
  resource: "bundles",
  title: "List Enrollments in Bundle",
  description: "Retrieve the Enrollments (in the Bundle and each Course within it) for a Bundle.",
  params: [
    idParam("Bundle"),
    ...paginationParams(),
    { key: "userId", label: "User ID", type: "number", hint: "Search by User ID." },
    { key: "email", label: "User email", type: "string", hint: "Search by User email." },
    { key: "completed", label: "Completed only", type: "boolean" },
    { key: "expired", label: "Expired only", type: "boolean" },
    { key: "createdAfter", label: "Created after", type: "date", hint: dateHint, advanced: true },
    { key: "createdBefore", label: "Created before", type: "date", hint: dateHint, advanced: true },
    { key: "createdOn", label: "Created on", type: "date", hint: dateHint, advanced: true },
    {
      key: "createdOnOrAfter",
      label: "Created on or after",
      type: "date",
      hint: dateHint,
      advanced: true,
    },
    {
      key: "createdOnOrBefore",
      label: "Created on or before",
      type: "date",
      hint: dateHint,
      advanced: true,
    },
    { key: "updatedAfter", label: "Updated after", type: "date", hint: dateHint, advanced: true },
    { key: "updatedBefore", label: "Updated before", type: "date", hint: dateHint, advanced: true },
    { key: "updatedOn", label: "Updated on", type: "date", hint: dateHint, advanced: true },
    {
      key: "updatedOnOrAfter",
      label: "Updated on or after",
      type: "date",
      hint: dateHint,
      advanced: true,
    },
    {
      key: "updatedOnOrBefore",
      label: "Updated on or before",
      type: "date",
      hint: dateHint,
      advanced: true,
    },
  ],
  output: [
    { key: "items", type: "array", label: "Enrollments" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    const query = {
      ...paginationQuery(input),
      ...queryFilters({
        user_id: input.userId,
        email: input.email,
        completed: input.completed,
        expired: input.expired,
        created_after: input.createdAfter,
        created_before: input.createdBefore,
        created_on: input.createdOn,
        created_on_or_after: input.createdOnOrAfter,
        created_on_or_before: input.createdOnOrBefore,
        updated_after: input.updatedAfter,
        updated_before: input.updatedBefore,
        updated_on: input.updatedOn,
        updated_on_or_after: input.updatedOnOrAfter,
        updated_on_or_before: input.updatedOnOrBefore,
      }),
    };
    return await new ThinkificClient(ctx).list(
      `/bundles/${encodeURIComponent(input.id)}/enrollments`,
      { query },
    );
  },
};

export default bundlesEnrollmentsList;
