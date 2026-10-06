import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient, readBody } from "../lib/client.ts";
import {
  assertUrlXorHtml,
  buildPageBody,
  buildQuery,
  type PageInput,
  type QueryInput,
  queryParams,
  requestOverridesParam,
  requestParams,
  urlParam,
  withOverrides,
} from "../lib/params.ts";

interface Input extends PageInput, QueryInput {
  includeResources?: boolean;
}

const exportAction: ActionDefinition<Input> = {
  key: "export",
  type: "read",
  resource: "page",
  title: "Export Page",
  description:
    "Fetch a URL in a headless browser and return it as a file. With resources included, " +
    "Browserless returns a ZIP of the page and its assets.",
  params: [
    { ...urlParam, required: true },
    {
      key: "includeResources",
      label: "Include resources (ZIP)",
      type: "boolean",
      hint: "Bundle images, scripts and styles with the page into a ZIP archive.",
    },
    ...requestParams.filter((p) => p.key !== "html"),
    ...queryParams,
    requestOverridesParam,
  ],
  output: [
    { key: "contentType", type: "string", label: "MIME type of the exported file" },
    { key: "sizeBytes", type: "number", label: "Size in bytes" },
    { key: "filename", type: "string", label: "File name from Content-Disposition" },
    { key: "text", type: "string", label: "Body text (text-like exports)" },
    { key: "base64", type: "string", label: "Body bytes (binary exports, e.g. ZIP)" },
  ],

  async execute(input, ctx) {
    assertUrlXorHtml({ url: input.url });
    if (!input.url) throw new Error("URL is required");
    const body = withOverrides({
      ...buildPageBody({ ...input, html: undefined }),
      includeResources: input.includeResources ? true : undefined,
    }, input.requestOverrides);
    const res = await new BrowserlessClient(ctx).response("/export", {
      method: "POST",
      query: buildQuery(input),
      body,
    });
    return await readBody(res);
  },
};

export default exportAction;
