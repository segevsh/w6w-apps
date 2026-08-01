import type { ActionDefinition } from "@w6w/types";
import { BoxClient } from "../lib/client.ts";

interface Input {
  folderId: string;
  fields?: string;
}

/**
 * Fetch metadata for a folder.
 * https://developer.box.com/reference/get-folders-id/
 */
const getFolder: ActionDefinition<Input> = {
  key: "get-folder",
  type: "read",
  resource: "folder",
  title: "Get Folder",
  description: "Retrieve metadata for a folder by ID.",
  params: [
    { key: "folderId", label: "Folder ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated list of attributes to include in the response.",
    },
  ],

  execute(input, ctx) {
    const client = new BoxClient(ctx);
    return client.request(`/folders/${input.folderId}`, {
      query: { fields: input.fields },
    });
  },
};

export default getFolder;
