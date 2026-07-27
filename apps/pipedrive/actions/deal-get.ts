import type { ActionDefinition } from "@w6w/types";
import { PipedriveClient } from "../lib/client.ts";

interface Input {
  dealId: number;
}

/** GET /deals/{id} — fetch a single deal by its numeric id. */
const dealGet: ActionDefinition<Input> = {
  key: "deal-get",
  type: "read",
  resource: "deal",
  title: "Get Deal",
  description: "Fetch a single deal by ID.",
  params: [
    { key: "dealId", label: "Deal ID", type: "number", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "data", type: "object", label: "Deal" },
  ],

  execute(input, ctx) {
    const client = new PipedriveClient(ctx);
    return client.request(`/deals/${encodeURIComponent(String(input.dealId))}`);
  },
};

export default dealGet;
