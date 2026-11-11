import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import query from "../actions/query.ts";
import { selectFields } from "../lib/triggers.ts";

interface Input {
  object: string;
  fields?: string;
}

/**
 * Newest-modified-first SOQL (`ORDER BY LastModifiedDate DESC`, documented SOQL ORDER BY:
 * https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_orderby.htm,
 * verified 2026-11-10). The id carries the stamp, so an edit is a new event.
 */
const newOrUpdatedRecord = pollFromListAction<Input>({
  key: "new-or-updated-record",
  title: "New or Updated Record",
  description:
    "Poll Salesforce records in last-modified order and emit records created or edited since the last check. The run gets the record.",
  action: query as unknown as ActionDefinition,
  input: (params) => ({
    soql: `SELECT ${
      selectFields(params, ["LastModifiedDate"])
    } FROM ${params.object} ORDER BY LastModifiedDate DESC LIMIT 100`,
  }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => {
    const r = item as { Id?: unknown; LastModifiedDate?: unknown };
    return `${String(r.Id ?? "")}:${String(r.LastModifiedDate ?? "")}`;
  },
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
      hint: "Comma-separated field API names. Id and LastModifiedDate are always included.",
    },
  ],
  output: [{ key: "record", type: "object", label: "New or updated record" }],
  sample: {
    Id: "003000000000001",
    Name: "Ada Lovelace",
    CreatedDate: "2026-11-09T12:00:00.000+0000",
    LastModifiedDate: "2026-11-10T09:30:00.000+0000",
  },
});

export default newOrUpdatedRecord;
