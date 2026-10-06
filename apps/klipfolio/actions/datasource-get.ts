import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, recordResult, seg } from "../lib/client.ts";

interface Input {
  datasource_id: string;
  client_id?: string;
}

/** `GET /datasources/{datasource_id}`. */
const datasourceGet: ActionDefinition<Input> = {
  key: "datasource-get",
  type: "read",
  resource: "datasource",
  title: "Get Datasource",
  description: "Get one datasource by ID.",
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
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "connector", type: "string", label: "Connector" },
    { key: "format", type: "string", label: "Format" },
    { key: "refresh_interval", type: "number", label: "Refresh interval in seconds" },
    { key: "is_dynamic", type: "boolean", label: "Whether the data source is dynamic" },
    { key: "disabled", type: "boolean", label: "Whether the data source is disabled" },
    { key: "date_last_refresh", type: "string", label: "Last refresh time (UTC)" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request(
      "GET",
      `/datasources/${seg(input.datasource_id)}`,
      { query: { client_id: input.client_id } },
    );
    return recordResult(env);
  },
};

export default datasourceGet;
