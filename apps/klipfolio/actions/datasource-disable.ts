import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, okResult, seg } from "../lib/client.ts";

interface Input {
  datasource_id: string;
}

/** `POST /datasources/{datasource_id}/@/disable`. */
const datasourceDisable: ActionDefinition<Input> = {
  key: "datasource-disable",
  type: "perform",
  resource: "datasource",
  title: "Disable Data Source",
  description: "Disable a data source so it stops refreshing.",
  idempotent: true,
  params: [
    { key: "datasource_id", label: "Data Source ID", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "op", type: "string", label: "Operation echoed back, when the API reports one" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request(
      "POST",
      `/datasources/${seg(input.datasource_id)}/@/disable`,
    );
    return okResult(env);
  },
};

export default datasourceDisable;
