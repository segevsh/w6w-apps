import type { ActionDefinition } from "@w6w/types";
import { DixaClient } from "../lib/client.ts";

const customAttributeList: ActionDefinition<Record<string, never>> = {
  key: "custom-attribute-list",
  type: "search",
  resource: "custom-attribute",
  title: "List Custom Attributes",
  description:
    "List custom attribute definitions (id, entityType, identifier, label, input definition). Their ids are the keys the custom-attribute update actions take.",
  params: [],
  output: [{ key: "data", type: "array", label: "Custom attribute definitions" }],

  execute(_input, ctx) {
    return new DixaClient(ctx).json("/custom-attributes");
  },
};

export default customAttributeList;
