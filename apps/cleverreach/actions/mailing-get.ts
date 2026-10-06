import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, pathId } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "mailing-get",
  type: "read",
  resource: "mailing",
  title: "Get a mailing",
  description: "Fetch one mailing by id (`GET /v3/mailings/{id}`).",
  params: [
    { key: "mailingId", label: "Mailing ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "item", type: "object", label: "The record as CleverReach returned it" },
  ],

  async execute(input, ctx) {
    return {
      item: await new CleverReachClient(ctx).request(
        `/mailings/${pathId(input.mailingId, "mailingId")}`,
      ),
    };
  },
};

export default action;
