import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /quotes/{quote_id}/html` — the quote as generated HTML.
 *
 * `text/html`, not JSON. The action returns the document as a string plus the
 * content type the vendor served, because a workflow usually wants to render,
 * store or mail it rather than parse it.
 */
interface Input {
  quoteId: number;
}

const quoteHtmlGet: ActionDefinition<Input, { html: string; contentType: string }> = {
  key: "quote-html-get",
  type: "read",
  resource: "quote",
  title: "Get Quote HTML",
  description: "Fetch a quote as generated HTML.",
  params: [idParam("quoteId", "Quote ID")],
  output: [
    { key: "html", type: "string", label: "The quote's HTML" },
    { key: "contentType", type: "string", label: "Content type Streamtime served it as" },
  ],

  async execute(input, ctx) {
    const { text, contentType } = await new StreamtimeClient(ctx).text(
      `/quotes/${encodeId(input.quoteId)}/html`,
    );
    return { html: text, contentType: contentType || "text/html" };
  },
};

export default quoteHtmlGet;
