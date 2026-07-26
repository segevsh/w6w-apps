import type { ActionDefinition } from "@w6w/types";
import { SalesforceClient, sobjectName, unset } from "../lib/client.ts";
import { recordId, sobject } from "../lib/params.ts";

interface Input {
  sobject: string;
  recordId: string;
  fields?: string;
}

const recordGet: ActionDefinition<Input> = {
  key: "record-get",
  type: "read",
  resource: "record",
  title: "Get Record",
  description: "Retrieve one record by id.",
  params: [
    sobject,
    recordId,
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated API names. Defaults to every field you can see.",
    },
  ],
  output: [
    { key: "Id", type: "string", label: "Record ID" },
    { key: "attributes", type: "object", label: "Type and URL" },
  ],

  execute(input, ctx) {
    return new SalesforceClient(ctx).request(
      `/sobjects/${sobjectName(input.sobject)}/${encodeURIComponent(input.recordId)}`,
      { query: { fields: unset(input.fields) } },
    );
  },
};

export default recordGet;
