import type { ActionDefinition } from "@w6w/types";
import { QuickBooksClient } from "../lib/client.ts";
import { invoiceId } from "../lib/params.ts";

interface Input {
  invoiceId: string;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Read a single invoice by Id.",
  params: [invoiceId],
  output: [{ key: "Invoice", type: "object", label: "Invoice" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).request(`/invoice/${encodeURIComponent(input.invoiceId)}`);
  },
};

export default invoiceGet;
