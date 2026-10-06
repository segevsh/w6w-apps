import type { ActionDefinition } from "@w6w/types";
import { seg, USER, WakaClient } from "../lib/client.ts";

interface Input {
  orgId: string;
}

/** `GET /api/v1/users/current/orgs/${seg(input.orgId)}/dashboards` */
const dashboardList: ActionDefinition<Input> = {
  key: "dashboard-list",
  type: "read",
  resource: "dashboard",
  title: "List Org Dashboards",
  description: "The dashboards of one organization.",
  params: [
    {
      key: "orgId",
      label: "Organization ID",
      type: "string",
      required: true,
      hint: "The id from List Organizations.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Dashboards" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/orgs/${seg(input.orgId)}/dashboards`);
  },
};

export default dashboardList;
