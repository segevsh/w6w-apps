import type { OutputField, Param } from "@w6w/types";

export const recordTypeParam: Param = {
  key: "recordType",
  label: "Record type",
  type: "string",
  required: true,
  placeholder: "customer",
  hint: "The REST record name: `customer`, `vendor`, `salesOrder`, `invoice`, " +
    "`customrecord_myrecord`… Use the Get Record Metadata action to list what your account exposes.",
};

export const recordIdParam: Param = {
  key: "id",
  label: "Record ID",
  type: "string",
  required: true,
  hint: "The internal id, or `eid:<externalId>` to address the record by its external id.",
};

export const additionalFieldsParam: Param = {
  key: "additionalFields",
  label: "Additional fields",
  type: "json",
  hint: "A JSON object of any other body fields, written the way the REST record schema names " +
    "them (custom fields are `custbody_…` / `custentity_…`). Merged over the fields above.",
};

export const writeOutput: OutputField[] = [
  { key: "id", type: "string", label: "Record internal ID (from the Location header)" },
  { key: "location", type: "string", label: "Record URL" },
];

export const pageOutput: OutputField[] = [
  { key: "items", type: "array", label: "Result rows" },
  { key: "count", type: "number", label: "Rows in this page" },
  { key: "offset", type: "number", label: "Offset of this page" },
  { key: "hasMore", type: "boolean", label: "More pages exist" },
  { key: "totalResults", type: "number", label: "Total matching rows" },
];

/** A reference field: `{ "id": "<internal id>" }`. */
export function ref(id: unknown): { id: string } {
  return { id: String(id) };
}

/**
 * Quote a string for a REST `q=` filter value. Oracle documents double quotes around a value with
 * spaces but no escape syntax for an embedded quote, so a value containing one is refused rather
 * than guessed at.
 */
export function quoteFilter(v: string): string {
  if (v.includes('"')) {
    throw new Error("Filter values cannot contain a double quote.");
  }
  return `"${v}"`;
}
