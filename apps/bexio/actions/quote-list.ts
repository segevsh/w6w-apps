import type { ActionDefinition } from "@w6w/types";
import { BexioClient, listQuery } from "../lib/client.ts";

interface Input {
  orderBy?: "id" | "total" | "total_net" | "total_gross" | "updated_at";
  descending?: boolean;
  limit?: number;
  offset?: number;
}

const quoteList: ActionDefinition<Input> = {
  key: "quote-list",
  type: "read",
  resource: "quote",
  title: "List Quotes",
  description: 'Fetch a page of quotes (kb_offer, "Angebot").',
  params: [
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "id", label: "ID" },
        { value: "total", label: "Total" },
        { value: "total_net", label: "Total (net)" },
        { value: "total_gross", label: "Total (gross)" },
        { value: "updated_at", label: "Last updated" },
      ],
      default: "id",
    },
    { key: "descending", label: "Descending", type: "boolean", default: false },
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max 2000." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "document_nr", type: "string", label: "Quote number" },
    { key: "total", type: "string", label: "Total" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).list("/2.0/kb_offer", listQuery(input));
  },
};

export default quoteList;
