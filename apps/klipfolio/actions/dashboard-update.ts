import type { ActionDefinition } from "@w6w/types";
import { compact, KlipfolioClient, okResult, seg } from "../lib/client.ts";

interface Input {
  dashboard_id: string;
  name?: string;
  description?: string;
  client_id?: string;
}

/** `PUT /tabs/{dashboard_id}`. */
const dashboardUpdate: ActionDefinition<Input> = {
  key: "dashboard-update",
  type: "perform",
  resource: "dashboard",
  title: "Update Dashboard",
  description: "Update a dashboard; only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "dashboard_id", label: "Dashboard ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
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
    const env = await new KlipfolioClient(ctx).request("PUT", `/tabs/${seg(input.dashboard_id)}`, {
      query: { client_id: input.client_id },
      body: compact({ name: input.name, description: input.description }),
    });
    return okResult(env);
  },
};

export default dashboardUpdate;
