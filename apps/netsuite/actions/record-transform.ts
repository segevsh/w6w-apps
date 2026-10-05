import type { ActionDefinition } from "@w6w/types";
import {
  jsonObject,
  NetSuiteClient,
  recordId,
  recordPath,
  recordType,
  writeResult,
} from "../lib/client.ts";
import { recordIdParam, writeOutput } from "../lib/params.ts";

interface Input {
  fromType: string;
  id: string;
  toType: string;
  fields?: unknown;
}

/**
 * `POST /services/rest/record/v1/<from>/<id>/!transform/<to>` — "Transforming Records", the
 * programmatic equivalent of NetSuite's "Bill" / "Fulfill" / "Credit" buttons (sales order ->
 * invoice, invoice -> credit memo, …). One request; 204 and a `Location` for the new record.
 */
const recordTransform: ActionDefinition<Input> = {
  key: "record-transform",
  type: "perform",
  resource: "record",
  title: "Transform Record",
  description:
    "Create a record of another type from an existing one (e.g. sales order to invoice).",
  // Each call creates another target record.
  idempotent: false,
  params: [
    {
      key: "fromType",
      label: "From record type",
      type: "string",
      required: true,
      placeholder: "salesOrder",
    },
    recordIdParam,
    {
      key: "toType",
      label: "To record type",
      type: "string",
      required: true,
      placeholder: "invoice",
      hint: "Any transformation NetSuite's SuiteScript `record.transform` supports.",
    },
    {
      key: "fields",
      label: "Field overrides",
      type: "json",
      hint: "Optional body fields for the new record, e.g. a `memo` or a subset of `item.items`.",
    },
  ],
  output: writeOutput,

  async execute(input, ctx) {
    const body = jsonObject(input.fields, "fields");
    const client = new NetSuiteClient(ctx);
    const path = `${recordPath(input.fromType, recordId(input.id))}/!transform/${
      recordType(input.toType)
    }`;
    return writeResult(
      await client.request(path, {
        method: "POST",
        body: Object.keys(body).length > 0 ? body : undefined,
      }),
    );
  },
};

export default recordTransform;
