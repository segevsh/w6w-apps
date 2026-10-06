import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, recordResult, seg } from "../lib/client.ts";

interface Input {
  instance_id: string;
  client_id?: string;
}

/** `GET /datasource-instances/{instance_id}`. */
const datasourceInstanceGet: ActionDefinition<Input> = {
  key: "datasource-instance-get",
  type: "read",
  resource: "datasource-instance",
  title: "Get Data Source Instance",
  description: "Get one data source instance: last and next refresh, failure count and data size.",
  params: [
    { key: "instance_id", label: "Instance ID", type: "string", required: true },
    {
      key: "client_id",
      label: "Client ID",
      type: "string",
      hint: "Act on a client account instead of the company account. Partner accounts only.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Instance ID" },
    { key: "datasource_id", type: "string", label: "Data source ID" },
    { key: "datasource_name", type: "string", label: "Data source name" },
    { key: "date_last_refresh", type: "string", label: "Last refresh time (UTC)" },
    { key: "date_next_refresh", type: "string", label: "Next refresh time (UTC)" },
    { key: "refresh_fail_count", type: "number", label: "Consecutive refresh failures" },
    { key: "data_size", type: "number", label: "Data size in bytes" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request(
      "GET",
      `/datasource-instances/${seg(input.instance_id)}`,
      { query: { client_id: input.client_id } },
    );
    return recordResult(env);
  },
};

export default datasourceInstanceGet;
