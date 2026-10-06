import type { ActionDefinition } from "@w6w/types";
import { DiffbotClient } from "../lib/client.ts";
import { COMMON_PARAMS, commonQuery, EXTRACT_OUTPUT, shapeExtract } from "../lib/extract.ts";
import type { ExtractInput } from "../lib/extract.ts";

interface Input extends ExtractInput {
  api: string;
  content: string;
  contentType?: string;
}

const APIS = [
  "analyze",
  "article",
  "product",
  "image",
  "video",
  "discussion",
  "event",
  "list",
  "job",
];

/**
 * `POST /v3/{api}?url=…` with the markup as the body — for pages Diffbot's servers
 * cannot reach but you can. `url` is still required: it resolves relative links.
 * `text/plain` is documented for the Article API only.
 */
const extractHtml: ActionDefinition<Input> = {
  key: "extract-html",
  type: "read",
  resource: "page",
  title: "Extract from HTML",
  description: "Send HTML (or plain text, Article API only) you already hold to an Extract API " +
    "instead of having Diffbot fetch the page. The URL is only used to resolve relative links.",
  params: [
    {
      key: "api",
      label: "Extract API",
      type: "select",
      required: true,
      default: "analyze",
      options: APIS.map((v) => ({ value: v, label: v })),
    },
    ...COMMON_PARAMS.slice(0, 1),
    { key: "content", label: "HTML or text", type: "text", required: true },
    {
      key: "contentType",
      label: "Content type",
      type: "select",
      default: "text/html",
      options: [
        { value: "text/html", label: "text/html (full markup)" },
        { value: "text/plain", label: "text/plain (Article API only)" },
      ],
    },
    ...COMMON_PARAMS.slice(1, 3),
  ],
  output: EXTRACT_OUTPUT,

  async execute(input, ctx) {
    if (!APIS.includes(input.api)) throw new Error(`Unknown Extract API "${input.api}"`);
    const contentType = input.contentType === "text/plain" ? "text/plain" : "text/html";
    if (contentType === "text/plain" && input.api !== "article") {
      throw new Error("Plain text is only supported by the Article API; use text/html");
    }
    const { body } = await new DiffbotClient(ctx).request(`/v3/${input.api}`, {
      method: "POST",
      query: commonQuery(input),
      raw: { body: input.content, contentType },
    });
    return shapeExtract(body);
  },
};

export default extractHtml;
