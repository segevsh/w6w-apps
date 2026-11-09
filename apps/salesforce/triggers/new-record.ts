import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import query from "../actions/query.ts";

interface Input {
  object: string;
  fields?: string;
}

const identifier = /^[A-Za-z0-9_]+$/;

function identifiers(input: Input): string {
  const fields = (input.fields ?? "Id,Name,CreatedDate").split(",").map((field) => field.trim());
  if (
    !identifier.test(input.object) || fields.length === 0 ||
    fields.some((field) => !identifier.test(field))
  ) {
    throw new Error(
      "Salesforce object and field API names may contain only letters, numbers, and underscores",
    );
  }
  if (!fields.includes("Id")) fields.unshift("Id");
  if (!fields.includes("CreatedDate")) fields.push("CreatedDate");
  return fields.join(", ");
}

const newRecord = pollFromListAction<Input>({
  key: "new-record",
  title: "New Record",
  description:
    "Poll Salesforce records in creation-date order and emit records not seen in the last checks.",
  action: query as unknown as ActionDefinition,
  input: (params) => ({
    soql: `SELECT ${identifiers(params)} FROM ${params.object} ORDER BY CreatedDate DESC LIMIT 100`,
  }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => String((item as { Id?: unknown }).Id ?? ""),
  params: [
    {
      key: "object",
      label: "Object API name",
      type: "string",
      required: true,
      placeholder: "Contact",
      hint: "Use the API name from Describe SObject, such as Contact or Invoice__c.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "Id,Name,CreatedDate",
      hint: "Comma-separated field API names. Id and CreatedDate are always included.",
    },
  ],
  output: [{ key: "record", type: "object", label: "New record" }],
  sample: {
    Id: "003000000000001",
    Name: "Ada Lovelace",
    CreatedDate: "2026-11-09T12:00:00.000+0000",
  },
});

export default newRecord;
