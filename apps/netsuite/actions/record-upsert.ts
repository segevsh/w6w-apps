import type { ActionDefinition } from "@w6w/types";
import {
  externalIdPath,
  jsonObject,
  NetSuiteClient,
  recordPath,
  writeResult,
} from "../lib/client.ts";
import { recordTypeParam, writeOutput } from "../lib/params.ts";

interface Input {
  recordType: string;
  externalId: string;
  fields: unknown;
}

/**
 * `PUT /services/rest/record/v1/<type>/eid:<externalId>` — "Using the Upsert Operation": creates
 * the record if no record has that external id, updates it if one does. Only valid with an
 * external id in the URL and the PUT method.
 */
const recordUpsert: ActionDefinition<Input> = {
  key: "record-upsert",
  type: "perform",
  resource: "record",
  title: "Upsert Record by External ID",
  description: "Create the record if the external id is new, otherwise update it (PUT).",
  // The external id makes a repeat call converge on one record.
  idempotent: true,
  params: [
    recordTypeParam,
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      required: true,
      hint: "Letters, digits, `_` and `-`. If it contains `|`, NetSuite reads it as a " +
        "multi-select delimiter and the URL form fails — use List Records with " +
        '`externalId IS "…"` instead.',
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'The record body, e.g. `{"firstName":"John","lastName":"Smith"}`. Creating a record ' +
        "still needs that type's mandatory fields.",
    },
  ],
  output: writeOutput,

  async execute(input, ctx) {
    const body = jsonObject(input.fields, "fields");
    const client = new NetSuiteClient(ctx);
    return writeResult(
      await client.request(recordPath(input.recordType, externalIdPath(input.externalId)), {
        method: "PUT",
        body,
      }),
    );
  },
};

export default recordUpsert;
