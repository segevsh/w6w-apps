import type { ActionDefinition } from "@w6w/types";
import { dataResult, KlipfolioClient, seg } from "../lib/client.ts";

interface Input {
  instance_id: string;
  client_id?: string;
}

/** `GET /datasource-instances/{instance_id}/data`. */
const datasourceInstanceDataGet: ActionDefinition<Input> = {
  key: "datasource-instance-data-get",
  type: "read",
  resource: "datasource-instance",
  title: "Get Data Source Instance Data",
  description: "Read the data held by a data source instance (CSV-like rows for tabular sources).",
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
    { key: "data", type: "object", label: "The instance data as the API returns it" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request(
      "GET",
      `/datasource-instances/${seg(input.instance_id)}/data`,
      { query: { client_id: input.client_id } },
    );
    return dataResult(env);
  },
};

export default datasourceInstanceDataGet;
