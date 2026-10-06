import type { ActionDefinition } from "@w6w/types";
import { kt } from "../lib/client.ts";

interface Input {
  email: string;
}

/** Return the contact ID for an email address. */
const subscriberSearch: ActionDefinition<Input> = {
  key: "subscriber-search",
  type: "search",
  resource: "subscriber",
  title: "Find Contact by Email",
  description: "Return the contact ID for an email address.",
  params: [
    { key: "email", label: "Email", type: "string", required: true },
  ],
  output: [
    { key: "subscriberId", type: "number", label: "Contact ID (null when none)" },
    { key: "subscriberIds", type: "array", label: "All matching contact IDs" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "subscriber-search");
    const ids = await kt(ctx, "POST", "/subscriber/search", { body: { email: input.email } });
    const subscriberIds = Array.isArray(ids) ? ids.map(Number) : [];
    return { subscriberId: subscriberIds[0] ?? null, subscriberIds };
  },
};

export default subscriberSearch;
