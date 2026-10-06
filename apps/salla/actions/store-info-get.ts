import type { ActionDefinition } from "@w6w/types";
import { SallaClient } from "../lib/client.ts";

type Input = Record<PropertyKey, never>;

const storeInfoGet: ActionDefinition<Input> = {
  key: "store-info-get",
  type: "read",
  resource: "store",
  title: "Get Store Information",
  description:
    "Fetch the store's own details: name, plan, status, currency, domain and default branch. Needs the `settings.read` scope.",

  params: [],
  output: [
    {
      "key": "status",
      "type": "number",
      "label": "HTTP status echoed in the envelope",
    },
    {
      "key": "success",
      "type": "boolean",
      "label": "Always true on success",
    },
    {
      "key": "data",
      "type": "object",
      "label": "The record",
    },
  ],

  execute(_input, ctx) {
    const client = new SallaClient(ctx);
    return client.get("/store/info");
  },
};

export default storeInfoGet;
