import type { ActionDefinition } from "@w6w/types";
import { queryFilters, ThinkificClient } from "../lib/client.ts";
import { type PaginationInput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input extends PaginationInput {
  userId?: number;
  courseId?: number;
  email?: string;
  freeTrial?: boolean;
  full?: boolean;
  completed?: boolean;
  expired?: boolean;
  createdOn?: string;
  createdBefore?: string;
  createdOnOrBefore?: string;
  createdAfter?: string;
  createdOnOrAfter?: string;
  updatedOn?: string;
  updatedBefore?: string;
  updatedOnOrBefore?: string;
  updatedAfter?: string;
}

const dateHint = "ISO 8601 date, e.g. 2026-08-15.";

const enrollmentsList: ActionDefinition<Input> = {
  key: "enrollments-list",
  type: "read",
  resource: "enrollments",
  title: "List Enrollments",
  description: "Retrieve a paginated, filterable list of course Enrollments on this Site.",
  params: [
    ...paginationParams(),
    { key: "userId", label: "User ID", type: "number", hint: "Search Enrollments by User ID." },
    {
      key: "courseId",
      label: "Course ID",
      type: "number",
      hint: "Search Enrollments by Course ID.",
    },
    { key: "email", label: "User email", type: "string", hint: "Search Enrollments by email." },
    { key: "freeTrial", label: "Free trial only", type: "boolean" },
    { key: "full", label: "Full enrollments only", type: "boolean" },
    { key: "completed", label: "Completed only", type: "boolean" },
    { key: "expired", label: "Expired only", type: "boolean" },
    { key: "createdOn", label: "Created on", type: "date", hint: dateHint, advanced: true },
    { key: "createdBefore", label: "Created before", type: "date", hint: dateHint, advanced: true },
    {
      key: "createdOnOrBefore",
      label: "Created on or before",
      type: "date",
      hint: dateHint,
      advanced: true,
    },
    { key: "createdAfter", label: "Created after", type: "date", hint: dateHint, advanced: true },
    {
      key: "createdOnOrAfter",
      label: "Created on or after",
      type: "date",
      hint: dateHint,
      advanced: true,
    },
    { key: "updatedOn", label: "Updated on", type: "date", hint: dateHint, advanced: true },
    { key: "updatedBefore", label: "Updated before", type: "date", hint: dateHint, advanced: true },
    {
      key: "updatedOnOrBefore",
      label: "Updated on or before",
      type: "date",
      hint: dateHint,
      advanced: true,
    },
    { key: "updatedAfter", label: "Updated after", type: "date", hint: dateHint, advanced: true },
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
        course_id: input.courseId,
        email: input.email,
        free_trial: input.freeTrial,
        full: input.full,
        completed: input.completed,
        expired: input.expired,
        created_on: input.createdOn,
        created_before: input.createdBefore,
        created_on_or_before: input.createdOnOrBefore,
        created_after: input.createdAfter,
        created_on_or_after: input.createdOnOrAfter,
        updated_on: input.updatedOn,
        updated_before: input.updatedBefore,
        updated_on_or_before: input.updatedOnOrBefore,
        updated_after: input.updatedAfter,
      }),
    };
    return await new ThinkificClient(ctx).list("/enrollments", { query });
  },
};

export default enrollmentsList;
