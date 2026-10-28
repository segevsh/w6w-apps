import type { ActionDefinition } from "@w6w/types";
import { AudiencesClient, normalizeAdAccountId, normalizeNodeId } from "../lib/client.ts";

interface Input {
  adAccountId: string;
  name: string;
  originAudienceId: string;
  country: string;
  type?: string;
  ratio?: number;
  startingRatio?: number;
  allowInternationalSeeds?: boolean;
}

/**
 * `POST /act_{id}/customaudiences` with `subtype=LOOKALIKE`,
 * `origin_audience_id` and a `lookalike_spec` — the "Custom Audience
 * lookalike" form in Meta's Lookalike Audiences guide. The seed must have at
 * least 100 members. Meta: "Set either type or ratio"; this action enforces
 * exactly one. The campaign / ad-set conversion lookalike form (`origin_ids`,
 * `conversion_type`) and `location_spec` are not covered; see README.
 */
const createLookalikeAudience: ActionDefinition<Input, { id: string }> = {
  key: "create-lookalike-audience",
  type: "perform",
  resource: "custom-audience",
  idempotent: false,
  title: "Create Lookalike Audience",
  description:
    "Build a lookalike audience from an existing custom audience of at least 100 people. Population takes 1-6 hours.",
  params: [
    { key: "adAccountId", label: "Ad Account ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "originAudienceId",
      label: "Seed audience ID",
      type: "string",
      required: true,
      hint: "A custom audience with at least 100 members.",
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      required: true,
      placeholder: "US",
      hint: "Two-letter country code to find lookalike people in.",
    },
    {
      key: "type",
      label: "Optimise for",
      type: "select",
      hint: "Set this or Ratio, not both.",
      options: [
        { value: "similarity", label: "Similarity (top 1%, more precise)" },
        { value: "reach", label: "Greater reach (top 5%, less precise)" },
      ],
    },
    {
      key: "ratio",
      label: "Ratio",
      type: "number",
      validation: { min: 0.01, max: 0.2 },
      hint: "Top share of the country, 0.01 to 0.20 in steps of 0.01. Set this or Optimise for.",
    },
    {
      key: "startingRatio",
      label: "Starting ratio",
      type: "number",
      validation: { min: 0, max: 0.2 },
      hint: "Optional lower bound of the band; must be below Ratio.",
    },
    {
      key: "allowInternationalSeeds",
      label: "Allow international seeds",
      type: "boolean",
      default: false,
      hint: "If fewer than 100 seed members are in the country, borrow from another country.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Lookalike audience ID" }],

  async execute(input, ctx) {
    const account = normalizeAdAccountId(input.adAccountId);
    const origin = normalizeNodeId(input.originAudienceId, "Seed audience ID");
    if (!input.name?.trim()) throw new Error("Name is required");
    const country = String(input.country ?? "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) throw new Error("Country must be a 2-letter country code");

    const hasType = !!input.type;
    const hasRatio = input.ratio !== undefined && input.ratio !== null;
    if (hasType === hasRatio) throw new Error("Set exactly one of Optimise for or Ratio");
    if (
      input.startingRatio !== undefined && hasRatio && !(input.startingRatio < input.ratio!)
    ) {
      throw new Error("Starting ratio must be less than Ratio");
    }

    const spec: Record<string, unknown> = { country };
    if (hasType) spec.type = input.type;
    if (hasRatio) spec.ratio = input.ratio;
    if (input.startingRatio !== undefined) spec.starting_ratio = input.startingRatio;
    if (input.allowInternationalSeeds) spec.allow_international_seeds = true;

    return await new AudiencesClient(ctx).request<{ id: string }>(`/${account}/customaudiences`, {
      method: "POST",
      form: {
        name: input.name,
        subtype: "LOOKALIKE",
        origin_audience_id: origin,
        lookalike_spec: spec,
      },
    });
  },
};

export default createLookalikeAudience;
