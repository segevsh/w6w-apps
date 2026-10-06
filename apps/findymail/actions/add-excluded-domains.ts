import type { ActionDefinition } from "@w6w/types";
import { compact, FindymailClient, strList } from "../lib/client.ts";

interface Input {
  domains: string;
  list_id?: number;
}

const addExcludedDomains: ActionDefinition<Input> = {
  key: "add-excluded-domains",
  type: "perform",
  resource: "exclusion-list",
  title: "Add Excluded Domains",
  description:
    "Add up to 10,000 domains to an exclusion list (or to the global list when no list ID is given). Past 50 domains the first 50 are processed immediately and the rest are queued.",
  idempotent: true,
  params: [{
    "key": "domains",
    "label": "Domains",
    "type": "text",
    "required": true,
    "hint": "Comma-separated, e.g. `a.com, b.io`.",
  }, {
    "key": "list_id",
    "label": "Exclusion list ID",
    "type": "number",
    "hint": "Omit to add to the global exclusion list.",
  }],
  output: [
    { "key": "success", "type": "boolean", "label": "Success" },
    { "key": "total", "type": "number", "label": "Domains submitted" },
    { "key": "processed_immediately", "type": "number", "label": "Processed now" },
    { "key": "queued", "type": "number", "label": "Queued" },
    { "key": "list_id", "type": "number", "label": "List ID" },
  ],

  async execute(input, ctx) {
    const domains = strList(input.domains);
    if (!domains) throw new Error("Add Excluded Domains needs at least one domain.");
    return await new FindymailClient(ctx).request("POST", "/api/intellimatch/domains", {
      body: compact({ domains, list_id: input.list_id }),
    });
  },
};

export default addExcludedDomains;
