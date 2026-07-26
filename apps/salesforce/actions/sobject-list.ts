import type { ActionDefinition } from "@w6w/types";
import { SalesforceClient } from "../lib/client.ts";

const sobjectList: ActionDefinition<Record<string, never>> = {
  key: "sobject-list",
  type: "search",
  resource: "metadata",
  title: "List Objects",
  description:
    "List every object in the org, standard and custom — the source of the API names other actions take.",
  params: [],
  output: [
    { key: "sobjects", type: "array", label: "Objects" },
    { key: "encoding", type: "string", label: "Encoding" },
  ],

  execute(_input, ctx) {
    return new SalesforceClient(ctx).request("/sobjects");
  },
};

export default sobjectList;
