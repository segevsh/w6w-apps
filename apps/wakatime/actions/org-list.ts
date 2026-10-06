import type { ActionDefinition } from "@w6w/types";
import { USER, WakaClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v1/users/current/orgs` */
const orgList: ActionDefinition<Input> = {
  key: "org-list",
  type: "read",
  resource: "organization",
  title: "List Organizations",
  description: "The organizations the user belongs to.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Organizations" },
  ],

  execute(_input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/orgs`);
  },
};

export default orgList;
