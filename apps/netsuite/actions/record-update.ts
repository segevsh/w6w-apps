import type { ActionDefinition } from "@w6w/types";
import { jsonObject, NetSuiteClient, recordId, recordPath, writeResult } from "../lib/client.ts";
import { recordIdParam, recordTypeParam, writeOutput } from "../lib/params.ts";

interface Input {
  recordType: string;
  id: string;
  fields: unknown;
}

/**
 * `PATCH /services/rest/record/v1/<type>/<id>` — "Updating a Record Instance". Omitted fields are
 * left unchanged; a body field set to `null` is deleted. 204, `Location` names the record.
 */
const recordUpdate: ActionDefinition<Input> = {
  key: "record-update",
  type: "perform",
  resource: "record",
  title: "Update Record",
  description: "Update some fields of an existing record (PATCH).",
  // Re-sending the same field values leaves the record in the same state.
  idempotent: true,
  params: [
    recordTypeParam,
    recordIdParam,
    {
      key: "fields",
      label: "Fields to change",
      type: "json",
      required: true,
      hint: 'Only the fields to change, e.g. `{"entityId":"Updated Customer"}`. Set a field to ' +
        "`null` to clear it. Read-only fields such as `id` are rejected.",
    },
  ],
  output: writeOutput,

  async execute(input, ctx) {
    const body = jsonObject(input.fields, "fields");
    const client = new NetSuiteClient(ctx);
    return writeResult(
      await client.request(recordPath(input.recordType, recordId(input.id)), {
        method: "PATCH",
        body,
      }),
    );
  },
};

export default recordUpdate;
