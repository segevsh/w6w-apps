import type { ActionDefinition } from "@w6w/types";
import { FindymailClient, intList } from "../lib/client.ts";

interface Input {
  ids: string;
}

const removeExcludedDomains: ActionDefinition<Input> = {
  key: "remove-excluded-domains",
  type: "perform",
  resource: "exclusion-list",
  title: "Remove Excluded Domains",
  description:
    "Remove excluded domains by their domain IDs (from List Excluded Domains). Only domains the caller may delete are removed.",
  idempotent: true,
  params: [{
    "key": "ids",
    "label": "Domain IDs",
    "type": "string",
    "required": true,
    "hint": "Comma-separated numeric IDs of excluded-domain rows, not domain names.",
  }],
  output: [{ "key": "deleted", "type": "boolean", "label": "Request accepted" }, {
    "key": "ids",
    "type": "array",
    "label": "Requested IDs",
  }],

  async execute(input, ctx) {
    const ids = intList(input.ids, "Domain IDs");
    if (!ids) throw new Error("Remove Excluded Domains needs at least one domain ID.");
    await new FindymailClient(ctx).request("DELETE", "/api/intellimatch/domains", {
      body: { ids },
    });
    return { deleted: true, ids };
  },
};

export default removeExcludedDomains;
