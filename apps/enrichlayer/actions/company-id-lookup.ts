import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `GET /company/resolve-id` */
const companyIdLookup: ActionDefinition<Input> = {
  key: "company-id-lookup",
  type: "read",
  resource: "company",
  title: "Look Up Company by Numeric ID",
  description: "Return the vanity ID of a company from its internal numeric ID (free).",
  params: [
    {
      key: "id",
      label: "Numeric company ID",
      type: "string",
      required: true,
      hint: "The company's internal, immutable numeric ID.",
    },
  ],
  output: [
    { key: "vanityId", type: "string", label: "Vanity ID" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/company/resolve-id", {
      id: input.id,
    });
    return {
      vanityId: (res as { vanity_id?: string }).vanity_id ?? null,
    };
  },
};

export default companyIdLookup;
