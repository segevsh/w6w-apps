import type { ActionDefinition } from "@w6w/types";
import { SalesforceClient, sobjectName } from "../lib/client.ts";
import { sobject } from "../lib/params.ts";

interface Input {
  sobject: string;
  records: unknown;
  allOrNone?: boolean;
}

/**
 * Salesforce's composite sObject-collections endpoint: up to 200 records in one
 * round trip, which is what keeps a bulk load inside API limits.
 *
 * `allOrNone` is the important switch — off, partial success is possible and
 * the result array has to be inspected per record.
 */
const recordCreateMany: ActionDefinition<Input> = {
  key: "record-create-many",
  type: "perform",
  resource: "record",
  title: "Create Records (bulk)",
  description: "Create up to 200 records of one object in a single request.",
  // Like `record-create`, each call mints new ids.
  idempotent: false,
  params: [
    sobject,
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      hint: 'Array of field maps, e.g. [{ "LastName": "Smith", "Company": "Acme" }]. Maximum 200.',
    },
    {
      key: "allOrNone",
      label: "All or none",
      type: "boolean",
      default: true,
      hint:
        "On rolls the whole batch back if any record fails. Off allows partial success — check each result.",
    },
  ],
  output: [{ key: "", type: "array", label: "One result per record: { id, success, errors }" }],

  execute(input, ctx) {
    const type = sobjectName(input.sobject);
    const raw = typeof input.records === "string" ? JSON.parse(input.records) : input.records;
    if (!Array.isArray(raw)) throw new Error("`records` must be a JSON array of field maps.");
    if (raw.length === 0) throw new Error("`records` is empty — nothing to create.");
    if (raw.length > 200) {
      throw new Error(`Salesforce accepts at most 200 records per request; got ${raw.length}.`);
    }
    return new SalesforceClient(ctx).request("/composite/sobjects", {
      method: "POST",
      body: {
        allOrNone: input.allOrNone !== false,
        // Each record has to name its own type in `attributes`.
        records: raw.map((r) => ({ attributes: { type }, ...(r as object) })),
      },
    });
  },
};

export default recordCreateMany;
