import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient } from "../lib/client.ts";
import {
  assertUrlXorHtml,
  buildPageBody,
  buildQuery,
  htmlParam,
  type PageInput,
  type QueryInput,
  queryParams,
  requestOverridesParam,
  requestParams,
  urlParam,
  withOverrides,
} from "../lib/params.ts";

interface Input extends PageInput, QueryInput {
  selectors: string;
}

/** One CSS selector per line, blank lines ignored. */
export function parseSelectors(text: string): Array<{ selector: string }> {
  return String(text ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    .map((selector) => ({ selector }));
}

const scrape: ActionDefinition<Input> = {
  key: "scrape",
  type: "read",
  resource: "page",
  title: "Scrape Elements",
  description:
    "Load a page, wait for its JavaScript, and return text, HTML, attributes and position for " +
    "every element matching each CSS selector.",
  params: [
    urlParam,
    htmlParam,
    {
      key: "selectors",
      label: "CSS selectors",
      type: "text",
      required: true,
      hint: "One selector per line, e.g. `h1` or `.product_pod h3 a`. The vendor waits up to 30 " +
        "seconds for them to appear, and uses `querySelectorAll`, so every match is returned.",
    },
    ...requestParams,
    ...queryParams,
    requestOverridesParam,
  ],
  output: [
    {
      key: "data",
      type: "array",
      label:
        "One entry per selector: { selector, results: [{ text, html, attributes, top, left, width, height }] }",
    },
  ],

  async execute(input, ctx) {
    assertUrlXorHtml(input);
    const elements = parseSelectors(input.selectors);
    if (elements.length === 0) throw new Error("Give at least one CSS selector");
    return await new BrowserlessClient(ctx).json("/scrape", {
      method: "POST",
      query: buildQuery(input),
      body: withOverrides({ ...buildPageBody(input), elements }, input.requestOverrides),
    });
  },
};

export default scrape;
