import type { ActionDefinition } from "@w6w/types";
import { ClickUpClient } from "../lib/client.ts";

interface Input {
  folderId?: string;
  spaceId?: string;
  name: string;
  content?: string;
  priority?: number;
  assignee?: number;
  status?: string;
  dueDate?: string;
}

function epochMs(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : undefined;
}

const listCreate: ActionDefinition<Input> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create List",
  description:
    "Create a list inside a folder, or a folderless list directly in a space. Provide a Folder ID or a Space ID.",
  idempotent: false,
  params: [
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      hint: "Create the list inside this folder. Leave blank for a folderless list.",
    },
    {
      key: "spaceId",
      label: "Space ID",
      type: "string",
      hint: "Required for a folderless list; ignored when a Folder ID is set.",
    },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "content", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: 1, label: "Urgent" },
        { value: 2, label: "High" },
        { value: 3, label: "Normal" },
        { value: 4, label: "Low" },
      ],
    },
    { key: "assignee", label: "Assignee (user ID)", type: "number" },
    { key: "status", label: "Status", type: "string" },
    { key: "dueDate", label: "Due date", type: "datetime" },
  ],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    const path = input.folderId
      ? `/folder/${encodeURIComponent(input.folderId)}/list`
      : `/space/${encodeURIComponent(input.spaceId ?? "")}/list`;
    if (!input.folderId && !input.spaceId) {
      throw new Error("list-create requires a Folder ID or a Space ID");
    }
    return new ClickUpClient(ctx).request(path, {
      method: "POST",
      body: {
        name: input.name,
        content: input.content,
        priority: input.priority,
        assignee: input.assignee,
        status: input.status,
        due_date: epochMs(input.dueDate),
      },
    });
  },
};

export default listCreate;
