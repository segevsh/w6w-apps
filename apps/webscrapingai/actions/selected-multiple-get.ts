import type { ActionDefinition } from "@w6w/types";
import { toList, WsaiClient } from "../lib/client.ts";
import { type PageInput, pageParams, pageQuery } from "../lib/params.ts";

interface Input extends PageInput {
  selectors: string[] | string;
}

const selectedMultipleGet: ActionDefinition<Input> = {
  key: "selected-multiple-get",
  type: "read",
  resource: "page",
  title: "Get HTML of Several CSS Selectors",
  description:
    "Fetch a page once and return, for each CSS selector, the inner HTML of every element it " +
    "matches (an empty list when nothing matches).",
  params: [
    ...pageParams.slice(0, 1),
    {
      key: "selectors",
      label: "CSS selectors",
      type: "text",
      required: true,
      hint: "One selector per line.",
    },
    ...pageParams.slice(1),
  ],
  output: [
    {
      key: "results",
      type: "array",
      label: "One list of HTML strings per selector, in request order",
    },
    { key: "count", type: "number", label: "Number of selectors" },
  ],

  async execute(input, ctx) {
    const selectors = toList(input.selectors);
    if (selectors.length === 0) throw new Error("At least one CSS selector is required");
    const results = await new WsaiClient(ctx).json<string[][]>("/selected-multiple", {
      ...pageQuery(input),
      selectors,
    });
    if (!Array.isArray(results)) {
      throw new Error("WebScraping.AI /selected-multiple: expected an array of arrays");
    }
    return { results, count: results.length };
  },
};

export default selectedMultipleGet;
