import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, okResult, seg } from "../lib/client.ts";

interface Input {
  datasource_id: string;
  client_id?: string;
}

/** `DELETE /datasources/{datasource_id}`. */
const datasourceDelete: ActionDefinition<Input> = {
  key: "datasource-delete",
  type: "perform",
  resource: "datasource",
  title: "Delete Datasource",
  description: "Permanently delete a datasource.",
  idempotent: true,
  params: [
    { key: "datasource_id", label: "Datasource ID", type: "string", required: true },
    {
      key: "client_id",
      label: "Client ID",
      type: "string",
      hint: "Act on a client account instead of the company account. Partner accounts only.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "op", type: "string", label: "Operation echoed back, when the API reports one" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request(
      "DELETE",
      `/datasources/${seg(input.datasource_id)}`,
      { query: { client_id: input.client_id } },
    );
    return okResult(env);
  },
};

export default datasourceDelete;
