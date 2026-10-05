import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  page_no?: number;
  page_size?: number;
}

const listBuyers: ActionDefinition<Input> = {
  key: "list-buyers",
  type: "search",
  title: "List Buyers",
  description: "List your buyers with their contact details, paginated.",
  params: [
    { key: "page_no", label: "Page number", type: "number", hint: "Starts at 1." },
    { key: "page_size", label: "Page size", type: "number", hint: "Items per page. Default 100." },
  ],
  output: [
    { key: "items", type: "array", label: "Buyers" },
    { key: "item_count", type: "number", label: "Total buyers" },
    { key: "page_count", type: "number", label: "Total pages" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "listBuyers",
      compact({ page_no: input.page_no, page_size: input.page_size }),
    );
  },
};

export default listBuyers;
