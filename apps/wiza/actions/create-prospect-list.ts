import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  dataOf,
  EMAIL_OPTION_PARAMS,
  emailOptions,
  ENRICHMENT_OPTIONS,
  GENERIC_EMAIL_PARAM,
  requireObject,
  WizaClient,
} from "../lib/client.ts";
import { LIST_OUTPUT } from "./get-list.ts";
import { PROSPECT_FILTERS_HINT } from "./search-prospects.ts";

interface Input {
  name: string;
  maxProfiles: number;
  filters: unknown;
  enrichmentLevel?: "none" | "partial" | "full";
  acceptWork?: boolean;
  acceptPersonal?: boolean;
  acceptGeneric?: boolean;
  skipDuplicates?: boolean;
  callbackUrl?: string;
}

const createProspectList: ActionDefinition<Input> = {
  key: "create-prospect-list",
  type: "perform",
  resource: "list",
  title: "Create Prospect List",
  description:
    "Create a list of prospects matching your filters and enrich them (POST /api/prospects/create_prospect_list). Asynchronous: poll Get List, then read Get List Contacts. `maxProfiles` caps the results. To take more from the same search later, use Continue Prospect Search. List creation can answer 503 while paused for maintenance; nothing is created, retry shortly.",
  idempotent: false,
  params: [
    { key: "name", label: "List name", type: "string", required: true },
    {
      key: "maxProfiles",
      label: "Max profiles",
      type: "number",
      required: true,
      hint: "The number of results to return.",
      validation: { min: 1, integer: true },
    },
    { key: "filters", label: "Filters", type: "json", required: true, hint: PROSPECT_FILTERS_HINT },
    {
      key: "enrichmentLevel",
      label: "Enrichment level",
      type: "select",
      default: "partial",
      options: ENRICHMENT_OPTIONS,
    },
    EMAIL_OPTION_PARAMS[0],
    EMAIL_OPTION_PARAMS[1],
    GENERIC_EMAIL_PARAM,
    {
      key: "skipDuplicates",
      label: "Skip duplicates",
      type: "boolean",
      hint: "Skip contacts previously found in other API lists.",
    },
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      hint: "Receives the list update. Defaults to the webhook URL in your account settings.",
    },
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const filters = requireObject(input.filters, "filters");
    if (!Number.isInteger(input.maxProfiles) || input.maxProfiles < 1) {
      throw new Error("maxProfiles must be a positive integer");
    }
    const email_options = emailOptions(input);
    if (email_options?.accept_work === false && email_options.accept_personal === false) {
      throw new Error("accept either work or personal emails");
    }
    const body = await new WizaClient(ctx).call("/api/prospects/create_prospect_list", {
      method: "POST",
      body: {
        list: compact({
          name: input.name,
          max_profiles: input.maxProfiles,
          enrichment_level: input.enrichmentLevel ?? "partial",
          email_options,
          skip_duplicates: input.skipDuplicates,
          callback_url: input.callbackUrl,
        }),
        filters,
      },
    });
    return dataOf(body);
  },
};

export default createProspectList;
