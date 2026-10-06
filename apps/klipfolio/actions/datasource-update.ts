import type { ActionDefinition } from "@w6w/types";
import { compact, KlipfolioClient, okResult, seg } from "../lib/client.ts";

interface Input {
  datasource_id: string;
  name?: string;
  description?: string;
  refresh_interval?: number;
  client_id?: string;
}

/** `PUT /datasources/{datasource_id}`. */
const datasourceUpdate: ActionDefinition<Input> = {
  key: "datasource-update",
  type: "perform",
  resource: "datasource",
  title: "Update Datasource",
  description: "Update a datasource; only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "datasource_id", label: "Datasource ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "refresh_interval",
      label: "Refresh interval (seconds)",
      type: "number",
      hint: "How often the data source refreshes; 0 means never.",
      validation: { min: 0, integer: true },
    },
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
      "PUT",
      `/datasources/${seg(input.datasource_id)}`,
      {
        query: { client_id: input.client_id },
        body: compact({
          name: input.name,
          description: input.description,
          refresh_interval: input.refresh_interval,
        }),
      },
    );
    return okResult(env);
  },
};

export default datasourceUpdate;
