import type { ActionDefinition } from "@w6w/types";
import { SalesforceClient } from "../lib/client.ts";

/**
 * Salesforce hands back `nextRecordsUrl` as an absolute path under the instance
 * host, already including the API version — so it is passed through verbatim
 * rather than being rebuilt.
 */
const queryMore: ActionDefinition<{ nextRecordsUrl: string }> = {
  key: "query-more",
  type: "search",
  resource: "query",
  title: "Query More",
  description: "Fetch the next page of a SOQL query using the `nextRecordsUrl` it returned.",
  params: [
    {
      key: "nextRecordsUrl",
      label: "Next records URL",
      type: "string",
      required: true,
      placeholder: "/services/data/v60.0/query/01g...-2000",
      hint: "Copied verbatim from a previous `query` result.",
    },
  ],
  output: [
    { key: "done", type: "boolean", label: "All records returned" },
    { key: "nextRecordsUrl", type: "string", label: "Locator for the next page" },
    { key: "records", type: "array", label: "Records" },
  ],

  execute(input, ctx) {
    const locator = input.nextRecordsUrl.trim();
    if (!locator.startsWith("/services/data/")) {
      throw new Error(
        "`nextRecordsUrl` must be the path Salesforce returned, starting `/services/data/`.",
      );
    }
    return new SalesforceClient(ctx).request(locator, { absolutePath: true });
  },
};

export default queryMore;
