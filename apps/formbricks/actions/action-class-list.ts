import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v1/management/action-classes` */
const actionClassList: ActionDefinition<Input> = {
  key: "action-class-list",
  type: "search",
  resource: "action-class",
  title: "List Action Classes",
  description: "List the action classes (triggers for in-app surveys) of the workspace.",
  params: [],
  output: [
    { key: "data", type: "array", label: "The records returned by Formbricks" },
  ],

  async execute(_input, ctx) {
    const res = await new FormbricksClient(ctx).request("GET", "/management/action-classes");
    return { data: res.data ?? [] };
  },
};

export default actionClassList;
