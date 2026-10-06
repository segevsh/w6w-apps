import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient, encodePath, unset } from "../lib/client.ts";
import { pathParam } from "../lib/params.ts";

interface Input {
  path: string;
  entryId?: string;
}

const itemDelete: ActionDefinition<Input> = {
  key: "item-delete",
  type: "perform",
  resource: "item",
  title: "Delete File or Folder",
  description:
    "Delete a file or folder (it goes to the trash). Give an entry ID to delete only one version of a file.",
  idempotent: true,
  params: [
    pathParam("Full path of the file or folder to delete."),
    {
      key: "entryId",
      label: "Version entry ID",
      type: "string",
      advanced: true,
      hint: "entry_id of one file version; leave blank to delete the whole item.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new EgnyteClient(ctx).request(`/v1/fs/${encodePath(input.path)}`, {
      method: "DELETE",
      query: { entry_id: unset(input.entryId) },
    });
    return { success: true };
  },
};

export default itemDelete;
