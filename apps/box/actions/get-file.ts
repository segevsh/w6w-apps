import type { ActionDefinition } from "@w6w/types";
import { BoxClient } from "../lib/client.ts";

interface Input {
  fileId: string;
  fields?: string;
}

/**
 * Fetch metadata for a file.
 * https://developer.box.com/reference/get-files-id/
 */
const getFile: ActionDefinition<Input> = {
  key: "get-file",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Retrieve metadata for a file by ID.",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated list of attributes to include in the response.",
    },
  ],

  execute(input, ctx) {
    const client = new BoxClient(ctx);
    return client.request(`/files/${input.fileId}`, {
      query: { fields: input.fields },
    });
  },
};

export default getFile;
