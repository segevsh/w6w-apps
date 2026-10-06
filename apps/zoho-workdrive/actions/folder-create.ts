import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, WorkDriveClient } from "../lib/client.ts";

interface Input {
  parentId: string;
  name: string;
}

/** `POST /files` with `{data:{type:"files",attributes:{parent_id,name}}}`. */
const folderCreate: ActionDefinition<Input> = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Create a folder inside a folder or team folder.",
  idempotent: false,
  params: [
    {
      key: "parentId",
      label: "Parent Folder ID",
      type: "string",
      required: true,
      hint: "Destination folder or team folder id.",
    },
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 200 } },
  ],
  output: [{ key: "item", type: "object", label: "Created folder (JSON:API `data`)" }],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).request("POST", "/files", {
      body: jsonApiBody("files", { parent_id: input.parentId, name: input.name }),
    });
    return { item: body.data ?? null };
  },
};

export default folderCreate;
