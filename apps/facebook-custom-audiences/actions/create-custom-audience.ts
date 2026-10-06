import type { ActionDefinition } from "@w6w/types";
import { AudiencesClient, normalizeAdAccountId } from "../lib/client.ts";

interface Input {
  adAccountId: string;
  name: string;
  description?: string;
  customerFileSource: string;
  retentionDays?: number;
  optOutLink?: string;
}

/**
 * `POST /act_{id}/customaudiences` with `subtype=CUSTOM` — "Step 1: create an
 * empty Custom Audience" in Meta's Customer File guide. Members are added
 * afterwards with Add Users. `customer_file_source` is sent because the guide
 * says to "specify `subtype=CUSTOM` and `customer_file_source`".
 *
 * Website, app and engagement audiences (subtype WEBSITE / ENGAGEMENT, which
 * take a `rule`) are not covered; see README.
 */
const createCustomAudience: ActionDefinition<Input, { id: string }> = {
  key: "create-custom-audience",
  type: "perform",
  resource: "custom-audience",
  idempotent: false,
  title: "Create Custom Audience",
  description:
    "Create an empty customer-file custom audience on an ad account. Add members afterwards with Add Users.",
  params: [
    { key: "adAccountId", label: "Ad Account ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "string" },
    {
      key: "customerFileSource",
      label: "Customer file source",
      type: "select",
      required: true,
      default: "USER_PROVIDED_ONLY",
      hint: "How the customer information was originally collected.",
      options: [
        { value: "USER_PROVIDED_ONLY", label: "Collected directly from customers" },
        { value: "PARTNER_PROVIDED_ONLY", label: "Sourced from partners" },
        { value: "BOTH_USER_AND_PARTNER_PROVIDED", label: "Both customers and partners" },
      ],
    },
    {
      key: "retentionDays",
      label: "Retention (days)",
      type: "number",
      validation: { min: 1, max: 180, integer: true },
      hint: "Days to keep a person in the audience, 1-180. Omit to keep forever.",
    },
    {
      key: "optOutLink",
      label: "Opt-out link",
      type: "string",
      hint: "URL where people can opt out of being targeted.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Custom Audience ID" }],

  async execute(input, ctx) {
    const account = normalizeAdAccountId(input.adAccountId);
    if (!input.name?.trim()) throw new Error("Name is required");
    return await new AudiencesClient(ctx).request<{ id: string }>(`/${account}/customaudiences`, {
      method: "POST",
      form: {
        name: input.name,
        subtype: "CUSTOM",
        description: input.description,
        customer_file_source: input.customerFileSource || "USER_PROVIDED_ONLY",
        retention_days: input.retentionDays,
        opt_out_link: input.optOutLink,
      },
    });
  },
};

export default createCustomAudience;
