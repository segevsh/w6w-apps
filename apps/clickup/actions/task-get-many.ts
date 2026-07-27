import type { ActionDefinition } from "@w6w/types";
import { ClickUpClient } from "../lib/client.ts";

interface Input {
  listId: string;
  archived?: boolean;
  includeClosed?: boolean;
  subtasks?: boolean;
  orderBy?: string;
  page?: number;
}

const taskGetMany: ActionDefinition<Input> = {
  key: "task-get-many",
  type: "read",
  resource: "task",
  title: "Get Many Tasks",
  description: "List tasks in a list (one page of results).",
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    { key: "archived", label: "Include archived", type: "boolean", default: false },
    { key: "includeClosed", label: "Include closed", type: "boolean", default: false },
    { key: "subtasks", label: "Include subtasks", type: "boolean", default: false },
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "created", label: "Created" },
        { value: "updated", label: "Updated" },
        { value: "due_date", label: "Due date" },
        { value: "id", label: "ID" },
      ],
    },
    { key: "page", label: "Page", type: "number", default: 0, hint: "Zero-based page index." },
  ],
  output: [{ key: "tasks", type: "array", label: "Tasks" }],

  execute(input, ctx) {
    return new ClickUpClient(ctx).request(
      `/list/${encodeURIComponent(input.listId)}/task`,
      {
        query: {
          archived: input.archived ? true : undefined,
          include_closed: input.includeClosed ? true : undefined,
          subtasks: input.subtasks ? true : undefined,
          order_by: input.orderBy,
          page: input.page,
        },
      },
    );
  },
};

export default taskGetMany;
