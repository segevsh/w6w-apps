import type { ActionDefinition } from "@w6w/types";
import { compact, FellowClient, nonEmpty, paginationBody } from "../lib/client.ts";
import { CURSOR, ON_BEHALF_OF, PAGE_SIZE, windowParams } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  cursor?: string;
  orderBy?: string;
  scope?: string;
  completed?: boolean;
  archived?: boolean;
  aiDetected?: boolean;
  aiSuggestionAccepted?: boolean;
  createdAtStart?: string;
  createdAtEnd?: string;
  updatedAtStart?: string;
  updatedAtEnd?: string;
  onBehalfOf?: string;
}

const actionItemList: ActionDefinition<Input> = {
  key: "action-item-list",
  type: "search",
  resource: "action-item",
  title: "List Action Items",
  description: "List action items with optional filters and ordering, one page at a time.",
  params: [
    PAGE_SIZE,
    CURSOR,
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "created_at_desc", label: "Newest first" },
        { value: "created_at_asc", label: "Oldest first" },
        { value: "updated_at_desc", label: "Recently updated first" },
        { value: "updated_at_asc", label: "Least recently updated first" },
        { value: "due_date", label: "Soonest due first" },
      ],
      hint:
        'Default is newest first. To page through a window of changes, combine an Updated-from bound with "Least recently updated first".',
    },
    {
      key: "scope",
      label: "Scope",
      type: "select",
      options: [{ value: "all", label: "All" }, {
        value: "assigned_to_me",
        label: "Assigned to me",
      }, { value: "assigned_to_others", label: "Assigned to others" }],
      hint: "Default: every action item the key's owner can access.",
    },
    {
      key: "completed",
      label: "Completed",
      type: "boolean",
      hint: "true: only completed; false: only not completed; leave unset for both.",
    },
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      hint: "true: only archived (won't do); false: only not archived; leave unset for both.",
    },
    {
      key: "aiDetected",
      label: "AI-detected",
      type: "boolean",
      hint: "true: only items Fellow's AI detected; false: only manually created.",
    },
    {
      key: "aiSuggestionAccepted",
      label: "AI suggestion accepted",
      type: "boolean",
      hint: "Filter on whether the user accepted the AI suggestion.",
    },
    ...windowParams("action items"),
    ON_BEHALF_OF,
  ],
  output: [
    { key: "items", type: "array", label: "Action items on this page" },
    { key: "cursor", type: "string", label: "Cursor for the next page (null at the end)" },
    { key: "pageSize", type: "number", label: "Page size used" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  execute(input, ctx) {
    return new FellowClient(ctx).page("action_items", "/action_items", {
      method: "POST",
      body: compact({
        pagination: paginationBody(input.pageSize, input.cursor),
        order_by: input.orderBy,
        filters: nonEmpty({
          scope: input.scope,
          completed: input.completed,
          archived: input.archived,
          ai_detected: input.aiDetected,
          ai_suggestion_accepted_by_user: input.aiSuggestionAccepted,
          created_at_start: input.createdAtStart,
          created_at_end: input.createdAtEnd,
          updated_at_start: input.updatedAtStart,
          updated_at_end: input.updatedAtEnd,
        }),
      }),
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default actionItemList;
