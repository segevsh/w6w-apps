import type { ActionDefinition } from "@w6w/types";
import { jsonObject, NetSuiteClient, recordPath, writeResult } from "../lib/client.ts";
import { recordTypeParam, writeOutput } from "../lib/params.ts";

interface Input {
  recordType: string;
  fields: unknown;
  externalId?: string;
}

/**
 * `POST /services/rest/record/v1/<type>` — "Creating a Record Instance". Success is **HTTP 204
 * with no body**; the new record's URL is in `Location`, so the id is read from there.
 */
const recordCreate: ActionDefinition<Input> = {
  key: "record-create",
  type: "perform",
  resource: "record",
  title: "Create Record",
  description: "Create a record of any type from a JSON body.",
  // Every call mints a new internal id (unless an externalId collides and NetSuite refuses it).
  idempotent: false,
  params: [
    recordTypeParam,
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'The record body, e.g. `{"companyName":"Acme","subsidiary":{"id":"1"}}`. Reference ' +
        'fields are `{"id": "<internal id>"}`; sublists nest as `{"item":{"items":[…]}}`. ' +
        "Omitted fields take NetSuite's defaults; read-only fields such as `id` are rejected.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint:
        "Optional. Letters, digits, `_` and `-`. Lets you address the record later as `eid:<id>`.",
    },
  ],
  output: writeOutput,

  async execute(input, ctx) {
    const body = jsonObject(input.fields, "fields");
    if (input.externalId) body.externalId = input.externalId;
    const client = new NetSuiteClient(ctx);
    return writeResult(
      await client.request(recordPath(input.recordType), { method: "POST", body }),
    );
  },
};

export default recordCreate;
