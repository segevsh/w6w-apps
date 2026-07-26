import type { Param } from "@w6w/types";

export const sobject: Param = {
  key: "sobject",
  label: "Object",
  type: "string",
  required: true,
  placeholder: "Lead",
  hint:
    "API name of the object: `Lead`, `Account`, `Contact`, `Opportunity`, `Case`, or a custom one like `Invoice__c`.",
};

export const recordId: Param = {
  key: "recordId",
  label: "Record ID",
  type: "string",
  required: true,
  hint: "The 15- or 18-character Salesforce id.",
};

export const fieldsParam: Param = {
  key: "fields",
  label: "Fields",
  type: "json",
  required: true,
  hint:
    'Field API name -> value, e.g. { "LastName": "Smith", "Company": "Acme", "Status": "Open" }.',
};

/** What a successful create/upsert returns. */
export const writeOutput = [
  { key: "id", type: "string" as const, label: "Record ID" },
  { key: "success", type: "boolean" as const, label: "Succeeded" },
  { key: "errors", type: "array" as const, label: "Errors" },
];
