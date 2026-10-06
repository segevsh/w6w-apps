import type { ActionDefinition } from "@w6w/types";
import { PdlClient } from "../lib/client.ts";
import { dataIncludeParam, sandboxParam, titlecaseParam } from "../lib/params.ts";
import { queryParam, scrollTokenParam, searchBody, sizeParam, sqlParam } from "../lib/search.ts";

type Input = Record<string, unknown>;

const searchPeople: ActionDefinition<Input> = {
  key: "search-people",
  type: "search",
  resource: "person",
  title: "Search People",
  description:
    "Search the PDL person dataset with an Elasticsearch query or a SQL query (passed through as written) and return matching profiles. Costs one credit per record returned, so set the page size. Page with the scroll_token. An empty result is found: false with no records, not an error.",
  params: [
    queryParam("person"),
    sqlParam("person"),
    sizeParam,
    scrollTokenParam,
    {
      key: "dataset",
      label: "Dataset",
      type: "string",
      hint:
        "Comma-separated slice datasets to search: all, resume (default), email, phone, mobile_phone, street_address, consumer_social, developer. Start with - to exclude (all,-phone).",
    },
    dataIncludeParam("person"),
    titlecaseParam,
    sandboxParam,
  ],
  output: [
    { key: "found", type: "boolean", label: "True when PDL returned records" },
    { key: "status", type: "number", label: "PDL status (200, or 404 for no/no more records)" },
    { key: "data", type: "array", label: "Person profiles" },
    { key: "total", type: "number", label: "Total records matching the query" },
    { key: "scroll_token", type: "string", label: "Pass back to fetch the next page" },
  ],

  async execute(input, ctx) {
    return await new PdlClient(ctx).request("POST", "/v5/person/search", {
      body: searchBody(input, ["dataset", "data_include", "titlecase"]),
      sandbox: input.sandbox === true,
      notFound: { data: [], total: 0, scroll_token: null },
    });
  },
};

export default searchPeople;
