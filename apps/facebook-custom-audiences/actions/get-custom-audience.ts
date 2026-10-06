import type { ActionDefinition } from "@w6w/types";
import { AudiencesClient, normalizeNodeId } from "../lib/client.ts";

interface Input {
  audienceId: string;
  fields?: string;
}

export interface CustomAudience {
  id: string;
  name?: string;
  description?: string;
  subtype?: string;
  account_id?: string;
  approximate_count_lower_bound?: number;
  approximate_count_upper_bound?: number;
  customer_file_source?: string;
  delivery_status?: { code?: number; description?: string };
  operation_status?: { code?: number; description?: string };
  retention_days?: number;
  time_created?: number;
  time_updated?: number;
  time_content_updated?: number;
  lookalike_spec?: Record<string, unknown>;
  lookalike_audience_ids?: string[];
  [key: string]: unknown;
}

/** Field names as listed in Meta's Custom Audience reference "Fields" table. */
export const AUDIENCE_FIELDS =
  "id,name,description,subtype,account_id,approximate_count_lower_bound,approximate_count_upper_bound,customer_file_source,delivery_status,operation_status,retention_days,time_created,time_updated,time_content_updated,lookalike_spec,lookalike_audience_ids";

const getCustomAudience: ActionDefinition<Input, CustomAudience> = {
  key: "get-custom-audience",
  type: "read",
  resource: "custom-audience",
  title: "Get Custom Audience",
  description:
    "Read one custom audience: size bounds, delivery status (200 = ready) and operation status of the last upload.",
  params: [
    { key: "audienceId", label: "Custom Audience ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: AUDIENCE_FIELDS,
      hint: "Comma-separated Graph field list.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Audience ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "subtype", type: "string", label: "Subtype" },
    { key: "approximate_count_lower_bound", type: "number", label: "Size (lower bound)" },
    { key: "approximate_count_upper_bound", type: "number", label: "Size (upper bound)" },
    { key: "delivery_status", type: "object", label: "Delivery status" },
    { key: "operation_status", type: "object", label: "Operation status" },
  ],

  async execute(input, ctx) {
    const id = normalizeNodeId(input.audienceId, "Custom Audience ID");
    return await new AudiencesClient(ctx).request<CustomAudience>(`/${id}`, {
      params: { fields: input.fields || AUDIENCE_FIELDS },
    });
  },
};

export default getCustomAudience;
