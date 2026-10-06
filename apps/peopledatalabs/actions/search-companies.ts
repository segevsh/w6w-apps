import type { ActionDefinition } from "@w6w/types";
import { PdlClient } from "../lib/client.ts";
import { sandboxParam, titlecaseParam } from "../lib/params.ts";
import { queryParam, scrollTokenParam, searchBody, sizeParam, sqlParam } from "../lib/search.ts";

type Input = Record<string, unknown>;

const searchCompanies: ActionDefinition<Input> = {
  key: "search-companies",
  type: "search",
  resource: "company",
  title: "Search Companies",
  description:
    "Search the PDL company dataset with an Elasticsearch query or a SQL query (passed through as written) and return matching company profiles. Costs one credit per record returned, so set the page size. Page with the scroll_token. An empty result is found: false with no records, not an error.",
  params: [
    queryParam("company"),
    sqlParam("company"),
    sizeParam,
    scrollTokenParam,
    titlecaseParam,
    sandboxParam,
  ],
  output: [
    { key: "found", type: "boolean", label: "True when PDL returned records" },
    { key: "status", type: "number", label: "PDL status (200, or 404 for no/no more records)" },
    { key: "data", type: "array", label: "Company profiles" },
    { key: "total", type: "number", label: "Total records matching the query" },
    { key: "scroll_token", type: "string", label: "Pass back to fetch the next page" },
  ],

  async execute(input, ctx) {
    return await new PdlClient(ctx).request("POST", "/v5/company/search", {
      body: searchBody(input, ["titlecase"]),
      sandbox: input.sandbox === true,
      notFound: { data: [], total: 0, scroll_token: null },
    });
  },
};

export default searchCompanies;
