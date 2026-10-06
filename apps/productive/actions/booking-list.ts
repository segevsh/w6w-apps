import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List resource bookings, filtered, sorted and paged (`GET /bookings`). Tentative bookings need `draft` and `withDraft` both true.
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  personId?: number;
  projectId?: number;
  budgetId?: number;
  taskId?: number;
  after?: string;
  before?: string;
  draft?: boolean;
  withDraft?: boolean;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const bookingList: ActionDefinition<Input> = {
  key: "booking-list",
  type: "search",
  resource: "booking",
  title: "List Bookings",
  description:
    "List resource bookings, filtered, sorted and paged (`GET /bookings`). Tentative bookings need `draft` and `withDraft` both true.",
  params: [
    { "key": "personId", "label": "Person ID", "type": "number" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    { "key": "budgetId", "label": "Budget (deal) ID", "type": "number" },
    { "key": "taskId", "label": "Task ID", "type": "number" },
    { "key": "after", "label": "After", "type": "date", "hint": "On or after this date." },
    { "key": "before", "label": "Before", "type": "date", "hint": "On or before this date." },
    {
      "key": "draft",
      "label": "Tentative only",
      "type": "boolean",
      "hint": "With `With drafts`, returns tentative bookings.",
    },
    { "key": "withDraft", "label": "With drafts", "type": "boolean" },
    ...listParams("`started_on`, `-started_on`, `draft`, `last_activity_at`."),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/bookings", {
      query: listQuery(input, {
        "person_id": input.personId,
        "project_id": input.projectId,
        "budget_id": input.budgetId,
        "task_id": input.taskId,
        "after": input.after,
        "before": input.before,
        "draft": input.draft,
        "with_draft": input.withDraft,
      }),
    });
    return items;
  },
};

export default bookingList;
