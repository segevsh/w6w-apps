import type { ActionDefinition } from "@w6w/types";
import { DatabricksClient } from "../lib/client.ts";

interface Input {
  catalogName: string;
}

/** DELETE /api/2.1/unity-catalog/catalogs/{name}. */
const catalogDelete: ActionDefinition<Input> = {
  key: "catalog-delete",
  type: "perform",
  resource: "catalog",
  title: "Delete Catalog",
  description: "Delete a Unity Catalog catalog.",
  idempotent: true,
  params: [
    { key: "catalogName", label: "Catalog Name", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const client = new DatabricksClient(ctx);
    await client.request(`/api/2.1/unity-catalog/catalogs/${input.catalogName}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default catalogDelete;
