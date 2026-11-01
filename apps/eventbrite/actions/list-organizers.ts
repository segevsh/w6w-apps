import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";
import { resolveEventbriteFields } from "../lib/fields.ts";
import { ORGANIZER_OUTPUT, PAGINATION_OUTPUT, T5_SAMPLE } from "../lib/outputs.ts";

interface Input {
  organizationId: string;
  page?: number;
}

const listOrganizers: ActionDefinition<Input> = {
  key: "list-organizers",
  type: "read",
  resource: "organizer",
  title: "List Organizers",
  description:
    "List organizers belonging to an organization. Organizers are the public-facing event hosts (logo, bio, social links) — distinct from Organizations.",
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      options: { source: "resolveFields" },
      config: { allowCustom: true },
    },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  resolveFields: resolveEventbriteFields,
  output: [
    { key: "organizers", type: "array", label: "Organizers", items: ORGANIZER_OUTPUT },
    ...PAGINATION_OUTPUT,
  ],
  sample: T5_SAMPLE.organizers,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request<EventbriteListResponse<"organizers">>(
      `/organizations/${encodeURIComponent(input.organizationId)}/organizers/`,
      { query: { page: input.page } },
    );
  },
};

export default listOrganizers;
