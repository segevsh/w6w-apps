import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
  quoteId: number;
}

const quoteGet: ActionDefinition<Input> = {
  key: "quote-get",
  type: "read",
  resource: "quote",
  title: "Get Quote",
  description: "Fetch a single quote by ID.",
  params: [
    { key: "quoteId", label: "Quote ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "document_nr", type: "string", label: "Quote number" },
    { key: "total", type: "string", label: "Total" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).get(`/2.0/kb_offer/${encodeURIComponent(input.quoteId)}`);
  },
};

export default quoteGet;
