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

type Input = PageInput & QueryInput;

const content: ActionDefinition<Input> = {
  key: "content",
  type: "read",
  resource: "page",
  title: "Get Rendered HTML",
  description:
    "Load a URL (or raw HTML) in a headless browser, run its JavaScript, and return the fully " +
    "rendered HTML.",
  params: [urlParam, htmlParam, ...requestParams, ...queryParams, requestOverridesParam],
  output: [
    { key: "html", type: "string", label: "Rendered HTML" },
    { key: "contentType", type: "string", label: "Response content type" },
    { key: "sizeBytes", type: "number", label: "HTML size in bytes" },
  ],

  async execute(input, ctx) {
    assertUrlXorHtml(input);
    const { text, contentType } = await new BrowserlessClient(ctx).text("/content", {
      method: "POST",
      query: buildQuery(input),
      body: withOverrides(buildPageBody(input), input.requestOverrides),
    });
    return { html: text, contentType, sizeBytes: new TextEncoder().encode(text).length };
  },
};

export default content;
