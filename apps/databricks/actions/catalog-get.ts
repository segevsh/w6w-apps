import type { ActionDefinition } from "@w6w/types";
import { DatabricksClient } from "../lib/client.ts";

interface Input {
  catalogName: string;
}

/** GET /api/2.1/unity-catalog/catalogs/{name}. */
const catalogGet: ActionDefinition<Input> = {
  key: "catalog-get",
  type: "read",
  resource: "catalog",
  title: "Get Catalog",
  description: "Get a single Unity Catalog catalog by name.",
  params: [
    { key: "catalogName", label: "Catalog Name", type: "string", required: true },
  ],
  output: [
    { key: "name", type: "string", label: "Catalog Name" },
  ],

  execute(input, ctx) {
    const client = new DatabricksClient(ctx);
    return client.request(`/api/2.1/unity-catalog/catalogs/${input.catalogName}`);
  },
};

export default catalogGet;
