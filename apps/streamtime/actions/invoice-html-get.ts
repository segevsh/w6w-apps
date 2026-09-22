import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /invoices/{invoice_id}/html` — the invoice as generated HTML. */
interface Input {
  invoiceId: number;
}

const invoiceHtmlGet: ActionDefinition<Input, { html: string; contentType: string }> = {
  key: "invoice-html-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice HTML",
  description: "Fetch an invoice as generated HTML.",
  params: [idParam("invoiceId", "Invoice ID")],
  output: [
    { key: "html", type: "string", label: "The invoice's HTML" },
    { key: "contentType", type: "string", label: "Content type Streamtime served it as" },
  ],

  async execute(input, ctx) {
    const { text, contentType } = await new StreamtimeClient(ctx).text(
      `/invoices/${encodeId(input.invoiceId)}/html`,
    );
    return { html: text, contentType: contentType || "text/html" };
  },
};

export default invoiceHtmlGet;
