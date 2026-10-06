import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient } from "../lib/client.ts";

interface Input {
  kind: "file" | "folder";
  id: string;
  listContent?: boolean;
}

const itemGetById: ActionDefinition<Input> = {
  key: "item-get-by-id",
  type: "read",
  resource: "item",
  title: "Get File or Folder by ID",
  description:
    "Fetch a file (by its group_id) or a folder (by its folder_id). IDs survive renames and moves, unlike paths.",
  params: [
    {
      key: "kind",
      label: "Kind",
      type: "select",
      required: true,
      options: [{ value: "file", label: "File" }, { value: "folder", label: "Folder" }],
    },
    {
      key: "id",
      label: "ID",
      type: "string",
      required: true,
      hint: "group_id for a file, folder_id for a folder.",
    },
    { key: "listContent", label: "List contents", type: "boolean", default: true },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "path", type: "string", label: "Path" },
    { key: "is_folder", type: "boolean", label: "Is folder" },
  ],

  execute(input, ctx) {
    return new EgnyteClient(ctx).request(
      `/v1/fs/ids/${input.kind}/${encodeURIComponent(input.id)}`,
      { query: { list_content: input.listContent === false ? "false" : undefined } },
    );
  },
};

export default itemGetById;
