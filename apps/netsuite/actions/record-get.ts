import type { ActionDefinition } from "@w6w/types";
import { NetSuiteClient, type Query, recordId, recordPath } from "../lib/client.ts";
import { recordIdParam, recordTypeParam } from "../lib/params.ts";

interface Input {
  recordType: string;
  id: string;
  fields?: string;
  expandSubResources?: boolean;
}

/** `GET /services/rest/record/v1/<type>/<id>` — verified in "Getting a Record Instance". */
const recordGet: ActionDefinition<Input> = {
  key: "record-get",
  type: "read",
  resource: "record",
  title: "Get Record",
  description: "Fetch one record of any type by internal id or external id.",
  params: [
    recordTypeParam,
    recordIdParam,
    {
      key: "fields",
      label: "Fields",
      type: "string",
      placeholder: "companyName,email,entityId",
      hint: "Comma-separated body fields to return. Sublist and subrecord fields cannot be " +
        "selected this way; leave blank for every body field.",
    },
    {
      key: "expandSubResources",
      label: "Expand sublists",
      type: "boolean",
      default: false,
      hint: "Return sublists inline instead of as links.",
    },
  ],
  output: [{
    key: "record",
    type: "object",
    label: "The record (body fields, plus HATEOAS links)",
  }],

  async execute(input, ctx) {
    const client = new NetSuiteClient(ctx);
    const query: Query = {
      fields: input.fields?.trim() || undefined,
      expandSubResources: input.expandSubResources ? "true" : undefined,
    };
    const res = await client.request(recordPath(input.recordType, recordId(input.id)), { query });
    return { record: res.data };
  },
};

export default recordGet;
