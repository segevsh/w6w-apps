import type { ActionDefinition } from "@w6w/types";
import { DatabricksClient } from "../lib/client.ts";

interface Input {
  fullName: string;
}

/** GET /api/2.1/unity-catalog/tables/{fullName}, e.g. "main.default.my_table". */
const tableGet: ActionDefinition<Input> = {
  key: "table-get",
  type: "read",
  resource: "table",
  title: "Get Table",
  description: "Get a single Unity Catalog table by its full name (catalog.schema.table).",
  params: [
    {
      key: "fullName",
      label: "Full Name",
      type: "string",
      required: true,
      placeholder: "main.default.my_table",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Table Name" },
  ],

  execute(input, ctx) {
    const client = new DatabricksClient(ctx);
    return client.request(`/api/2.1/unity-catalog/tables/${input.fullName}`);
  },
};

export default tableGet;
