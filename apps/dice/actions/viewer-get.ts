import type { ActionDefinition } from "@w6w/types";
import { isObject, query, VIEWER_QUERY } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "viewer-get",
  type: "read",
  resource: "partner",
  title: "Get partner",
  description: "Read the authenticated DICE partner's ID and name.",
  output: [{ key: "id", type: "string", label: "Partner ID" }, {
    key: "name",
    type: "string",
    label: "Partner name",
  }],
  async execute(_input, ctx) {
    const data = await query(ctx, VIEWER_QUERY);
    if (!isObject(data.viewer) || data.viewer.id == null) {
      throw new Error("DICE returned no partner.");
    }
    return data.viewer;
  },
};
export default action;
