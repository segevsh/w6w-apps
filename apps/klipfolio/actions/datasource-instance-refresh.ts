import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, okResult, seg } from "../lib/client.ts";

interface Input {
  instance_id: string;
  client_id?: string;
}

/** `POST /datasource-instances/{instance_id}/@/refresh`. */
const datasourceInstanceRefresh: ActionDefinition<Input> = {
  key: "datasource-instance-refresh",
  type: "perform",
  resource: "datasource-instance",
  title: "Refresh Data Source Instance",
  description:
    "Queue a data source instance for refresh. The refresh is queued and may not run instantly.",
  idempotent: false,
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
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "op", type: "string", label: "Operation echoed back, when the API reports one" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request(
      "POST",
      `/datasource-instances/${seg(input.instance_id)}/@/refresh`,
      { query: { client_id: input.client_id } },
    );
    return okResult(env);
  },
};

export default datasourceInstanceRefresh;
