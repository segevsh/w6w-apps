import type { ActionDefinition } from "@w6w/types";
import { AudiencesClient, type GraphListResponse, normalizeAdAccountId } from "../lib/client.ts";
import { AUDIENCE_FIELDS, type CustomAudience } from "./get-custom-audience.ts";

interface Input {
  adAccountId: string;
  limit?: number;
  cursor?: string;
  fields?: string;
  pixelId?: string;
}

/** `GET /act_{id}/customaudiences` — "Default behavior is to return only the IDs", so fields are always sent. */
const listCustomAudiences: ActionDefinition<Input, GraphListResponse<CustomAudience>> = {
  key: "list-custom-audiences",
  type: "read",
  resource: "custom-audience",
  title: "List Custom Audiences",
  description:
    "List the custom audiences (customer lists, website audiences and lookalikes) on an ad account.",
  params: [
    {
      key: "adAccountId",
      label: "Ad Account ID",
      type: "string",
      required: true,
      hint: "From List Ad Accounts. With or without the act_ prefix.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      validation: { min: 1, max: 100, integer: true },
    },
    { key: "cursor", label: "Cursor", type: "string", hint: "`after` cursor from a prior page." },
    {
      key: "pixelId",
      label: "Pixel ID",
      type: "string",
      hint: "Only audiences associated with this pixel.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: AUDIENCE_FIELDS,
      hint: "Comma-separated Graph field list.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Custom audiences" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  async execute(input, ctx) {
    const account = normalizeAdAccountId(input.adAccountId);
    return await new AudiencesClient(ctx).request<GraphListResponse<CustomAudience>>(
      `/${account}/customaudiences`,
      {
        params: {
          fields: input.fields || AUDIENCE_FIELDS,
          limit: input.limit ?? 25,
          after: input.cursor,
          pixel_id: input.pixelId,
        },
      },
    );
  },
};

export default listCustomAudiences;
