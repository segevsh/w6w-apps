import type { ActionDefinition } from "@w6w/types";
import { LoyverseClient } from "../lib/client.ts";

/** `GET /v1.0/merchant` — business name, email, country and currency of the account. */
const merchantGet: ActionDefinition<Record<string, never>> = {
  key: "merchant-get",
  type: "read",
  resource: "merchant",
  title: "Get Merchant",
  description: "Get the business name, email, country and currency of the connected account.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Merchant id" },
    { key: "business_name", type: "string", label: "Business name" },
    { key: "email", type: "string", label: "Email" },
    { key: "country", type: "string", label: "Country (ISO 3166-1 alpha-2)" },
    { key: "currency", type: "object", label: "Currency {code, decimal_places}" },
  ],
  execute(_input, ctx) {
    return new LoyverseClient(ctx).json("/merchant");
  },
};

export default merchantGet;
