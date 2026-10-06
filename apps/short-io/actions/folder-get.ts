import type { ActionDefinition } from "@w6w/types";
import { ShortClient } from "../lib/client.ts";

interface Input {
  domainId: number;
  folderId: string;
}

/** GET /links/folders/{domainId}/{folderId}. Response schema undocumented; returned untouched. */
const folderGet: ActionDefinition<Input, { result: unknown }> = {
  key: "folder-get",
  type: "read",
  resource: "folder",
  title: "Get Folder",
  description: "Fetch one link folder on a domain.",
  params: [
    {
      key: "domainId",
      label: "Domain ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    { key: "folderId", label: "Folder ID", type: "string", required: true },
  ],
  output: [{ key: "result", type: "object", label: "Vendor response (shape not documented)" }],

  async execute(input, ctx) {
    const result = await new ShortClient(ctx).request<unknown>(
      `/links/folders/${input.domainId}/${encodeURIComponent(input.folderId)}`,
    );
    return { result };
  },
};

export default folderGet;
