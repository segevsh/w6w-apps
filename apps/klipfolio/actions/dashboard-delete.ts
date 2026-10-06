import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, okResult, seg } from "../lib/client.ts";

interface Input {
  dashboard_id: string;
  client_id?: string;
}

/** `DELETE /tabs/{dashboard_id}`. */
const dashboardDelete: ActionDefinition<Input> = {
  key: "dashboard-delete",
  type: "perform",
  resource: "dashboard",
  title: "Delete Dashboard",
  description: "Permanently delete a dashboard.",
  idempotent: true,
  params: [
    { key: "dashboard_id", label: "Dashboard ID", type: "string", required: true },
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
      `/tabs/${seg(input.dashboard_id)}`,
      { query: { client_id: input.client_id } },
    );
    return okResult(env);
  },
};

export default dashboardDelete;
