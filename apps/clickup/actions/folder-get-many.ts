import type { ActionDefinition } from "@w6w/types";
import { ClickUpClient } from "../lib/client.ts";

interface Input {
  spaceId: string;
  archived?: boolean;
}

const folderGetMany: ActionDefinition<Input> = {
  key: "folder-get-many",
  type: "read",
  resource: "folder",
  title: "Get Many Folders",
  description: "List the folders in a space.",
  params: [
    { key: "spaceId", label: "Space ID", type: "string", required: true },
    { key: "archived", label: "Include archived", type: "boolean", default: false },
  ],
  output: [{ key: "folders", type: "array", label: "Folders" }],

  execute(input, ctx) {
    return new ClickUpClient(ctx).request(
      `/space/${encodeURIComponent(input.spaceId)}/folder`,
      { query: { archived: input.archived ? true : undefined } },
    );
  },
};

export default folderGetMany;
