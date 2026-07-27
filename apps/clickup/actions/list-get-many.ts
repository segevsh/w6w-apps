import type { ActionDefinition } from "@w6w/types";
import { ClickUpClient } from "../lib/client.ts";

interface Input {
  folderId?: string;
  spaceId?: string;
  archived?: boolean;
}

const listGetMany: ActionDefinition<Input> = {
  key: "list-get-many",
  type: "read",
  resource: "list",
  title: "Get Many Lists",
  description:
    "List the lists in a folder, or the folderless lists in a space. Provide a Folder ID or a Space ID.",
  params: [
    { key: "folderId", label: "Folder ID", type: "string", hint: "Lists inside this folder." },
    {
      key: "spaceId",
      label: "Space ID",
      type: "string",
      hint: "Folderless lists in this space; ignored when a Folder ID is set.",
    },
    { key: "archived", label: "Include archived", type: "boolean", default: false },
  ],
  output: [{ key: "lists", type: "array", label: "Lists" }],

  execute(input, ctx) {
    if (!input.folderId && !input.spaceId) {
      throw new Error("list-get-many requires a Folder ID or a Space ID");
    }
    const path = input.folderId
      ? `/folder/${encodeURIComponent(input.folderId)}/list`
      : `/space/${encodeURIComponent(input.spaceId ?? "")}/list`;
    return new ClickUpClient(ctx).request(path, {
      query: { archived: input.archived ? true : undefined },
    });
  },
};

export default listGetMany;
