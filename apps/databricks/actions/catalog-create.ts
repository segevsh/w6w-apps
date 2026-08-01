import type { ActionDefinition } from "@w6w/types";
import { DatabricksClient } from "../lib/client.ts";

interface Input {
  name: string;
  comment?: string;
}

/** POST /api/2.1/unity-catalog/catalogs. Verified against n8n's `unityCatalog/createCatalog.operation.ts`. */
const catalogCreate: ActionDefinition<Input> = {
  key: "catalog-create",
  type: "perform",
  resource: "catalog",
  title: "Create Catalog",
  description: "Create a Unity Catalog catalog.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "comment", label: "Comment", type: "string" },
  ],
  output: [
    { key: "name", type: "string", label: "Catalog Name" },
  ],

  execute(input, ctx) {
    const client = new DatabricksClient(ctx);
    const body: Record<string, unknown> = { name: input.name };
    if (input.comment) body.comment = input.comment;
    return client.request("/api/2.1/unity-catalog/catalogs", { method: "POST", body });
  },
};

export default catalogCreate;
