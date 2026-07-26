import type { ActionDefinition } from "@w6w/types";
import { SalesforceClient, sobjectName } from "../lib/client.ts";
import { sobject } from "../lib/params.ts";

/**
 * The metadata behind every other action: field API names, types, picklist
 * values, which fields are required, and which are marked External ID (the
 * ones `record-upsert` accepts).
 */
const sobjectDescribe: ActionDefinition<{ sobject: string }> = {
  key: "sobject-describe",
  type: "read",
  resource: "metadata",
  title: "Describe Object",
  description:
    "Fetch an object's field metadata — API names, types, picklist values and which fields are External IDs.",
  params: [sobject],
  output: [
    { key: "name", type: "string", label: "Object name" },
    { key: "label", type: "string", label: "Label" },
    { key: "fields", type: "array", label: "Fields" },
    { key: "createable", type: "boolean", label: "Createable" },
  ],

  execute(input, ctx) {
    return new SalesforceClient(ctx).request(
      `/sobjects/${sobjectName(input.sobject)}/describe`,
    );
  },
};

export default sobjectDescribe;
