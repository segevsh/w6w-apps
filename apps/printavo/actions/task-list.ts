import type { ActionDefinition } from "@w6w/types";
import { csv, DEFAULT_PAGE_SIZE, PrintavoClient, toPage } from "../lib/client.ts";
import { PAGE_INFO, TASK_FIELDS } from "../lib/fields.ts";

interface Input {
  first?: number;
  after?: string;
  assigneeId?: string;
  completed?: boolean;
  dueAfter?: string;
  dueBefore?: string;
  includedOrderStatusIds?: string;
  excludedOrderStatusIds?: string;
  sortOn?: string;
  sortDescending?: boolean;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description:
    "List tasks, filtered by assignee, completion, due window or the status of the order they hang off.",
  params: [
    {
      key: "first",
      label: "Page Size",
      type: "number",
      hint: "Items per page (default 25).",
      default: 25,
    },
    {
      key: "after",
      label: "After Cursor",
      type: "string",
      hint: "endCursor from a previous call.",
    },
    { key: "assigneeId", label: "Assignee User ID", type: "string" },
    { key: "completed", label: "Completed", type: "boolean" },
    { key: "dueAfter", label: "Due After", type: "string", hint: "ISO 8601 datetime." },
    { key: "dueBefore", label: "Due Before", type: "string", hint: "ISO 8601 datetime." },
    {
      key: "includedOrderStatusIds",
      label: "Include Order Status IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "excludedOrderStatusIds",
      label: "Exclude Order Status IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "sortOn",
      label: "Sort On",
      type: "select",
      options: [{ label: "Created at", value: "CREATED_AT" }, { label: "Due at", value: "DUE_AT" }],
    },
    { key: "sortDescending", label: "Sort Descending", type: "boolean" },
  ],
  output: [
    { key: "nodes", type: "array", label: "Tasks" },
    { key: "totalNodes", type: "number", label: "Total Matching" },
    { key: "hasNextPage", type: "boolean", label: "More Pages" },
    { key: "endCursor", type: "string", label: "Next Cursor" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ tasks: Parameters<typeof toPage>[0] }>(
      `query($first: Int, $after: String, $assigneeId: ID, $completed: Boolean, $dueAfter: ISO8601DateTime, $dueBefore: ISO8601DateTime, $includedOrderStatusIds: [ID!], $excludedOrderStatusIds: [ID!], $sortOn: TaskSortField, $sortDescending: Boolean) { tasks(first: $first, after: $after, assigneeId: $assigneeId, completed: $completed, dueAfter: $dueAfter, dueBefore: $dueBefore, includedOrderStatusIds: $includedOrderStatusIds, excludedOrderStatusIds: $excludedOrderStatusIds, sortOn: $sortOn, sortDescending: $sortDescending) { totalNodes ${PAGE_INFO} nodes { ${TASK_FIELDS} } } }`,
      {
        first: input.first ?? DEFAULT_PAGE_SIZE,
        after: input.after,
        assigneeId: input.assigneeId,
        completed: input.completed,
        dueAfter: input.dueAfter,
        dueBefore: input.dueBefore,
        includedOrderStatusIds: csv(input.includedOrderStatusIds),
        excludedOrderStatusIds: csv(input.excludedOrderStatusIds),
        sortOn: input.sortOn,
        sortDescending: input.sortDescending,
      },
    );
    return toPage(data.tasks);
  },
};

export default taskList;
