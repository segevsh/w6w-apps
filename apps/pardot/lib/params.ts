import type { Param } from "@w6w/types";

export const fieldsParam = (defaults: string): Param => ({
  key: "fields",
  label: "Fields to return",
  type: "string",
  default: defaults,
  hint:
    "Comma-separated field names. Pardot v5 requires an explicit list. Use dot notation for related objects, e.g. `campaign.name`. Custom prospect fields end in `__c`.",
});

export const deletedParam: Param = {
  key: "deleted",
  label: "Recycle bin",
  type: "select",
  default: "false",
  options: [
    { value: "false", label: "Exclude deleted (default)" },
    { value: "true", label: "Only deleted" },
    { value: "all", label: "Both" },
  ],
};

export const prospectIdParam: Param = {
  key: "prospectId",
  label: "Prospect ID",
  type: "number",
  required: true,
  hint: "The Account Engagement prospect id (an integer, not a Salesforce id).",
};

export const tagIdParam: Param = {
  key: "tagId",
  label: "Tag ID",
  type: "number",
  required: true,
};

/** Shape of an `addTag` response — it creates a TaggedObject. */
export const taggedObjectOutput = [
  { key: "id", type: "number" as const, label: "Tagged object ID" },
  { key: "objectId", type: "number" as const, label: "Tagged record ID" },
  { key: "objectType", type: "string" as const, label: "Tagged record type" },
  { key: "tagId", type: "number" as const, label: "Tag ID" },
  { key: "createdAt", type: "string" as const, label: "Created at" },
];

export const pageOutput = [
  { key: "values", type: "array" as const, label: "Records" },
  { key: "nextPageToken", type: "string" as const, label: "Token for the next page, or null" },
  { key: "nextPageUrl", type: "string" as const, label: "URL of the next page, or null" },
];
