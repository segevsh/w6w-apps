import type { ActionDefinition } from "@w6w/types";
import { SalesforceClient } from "../lib/client.ts";

interface Input {
  soql: string;
  includeDeleted?: boolean;
}

const query: ActionDefinition<Input> = {
  key: "query",
  type: "search",
  resource: "query",
  title: "Query (SOQL)",
  description:
    "Run a SOQL query. Salesforce caps a page at 2000 records — follow `nextRecordsUrl` with `query-more`.",
  params: [
    {
      key: "soql",
      label: "SOQL",
      type: "text",
      required: true,
      config: { multiline: true },
      placeholder: "SELECT Id, Name, Email FROM Contact WHERE CreatedDate = LAST_N_DAYS:7",
      hint: "SOQL requires an explicit field list — `SELECT *` does not exist.",
    },
    {
      key: "includeDeleted",
      label: "Include deleted",
      type: "boolean",
      hint: "Query the Recycle Bin and archived records too (queryAll).",
    },
  ],
  output: [
    { key: "totalSize", type: "number", label: "Total matches" },
    { key: "done", type: "boolean", label: "All records returned" },
    { key: "nextRecordsUrl", type: "string", label: "Locator for the next page" },
    { key: "records", type: "array", label: "Records" },
  ],

  execute(input, ctx) {
    const endpoint = input.includeDeleted ? "/queryAll" : "/query";
    return new SalesforceClient(ctx).request(endpoint, { query: { q: input.soql } });
  },
};

export default query;
