import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, recordResult, seg } from "../lib/client.ts";

interface Input {
  dashboard_id: string;
  full?: boolean;
  client_id?: string;
}

/** `GET /tabs/{dashboard_id}`. */
const dashboardGet: ActionDefinition<Input> = {
  key: "dashboard-get",
  type: "read",
  resource: "dashboard",
  title: "Get Dashboard",
  description: "Get one dashboard by ID.",
  params: [
    { key: "dashboard_id", label: "Dashboard ID", type: "string", required: true },
    {
      key: "full",
      label: "Include associations",
      type: "boolean",
      hint: "Include associations (klip_instances, share_rights).",
    },
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
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("GET", `/tabs/${seg(input.dashboard_id)}`, {
      query: { full: input.full, client_id: input.client_id },
    });
    return recordResult(env);
  },
};

export default dashboardGet;
