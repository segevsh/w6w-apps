import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { resolveEventbriteFields } from "../lib/fields.ts";
import { ORGANIZER_OUTPUT, ORGANIZER_SAMPLE } from "../lib/outputs.ts";

interface Input {
  organizerId: string;
}

const getOrganizer: ActionDefinition<Input> = {
  key: "get-organizer",
  type: "read",
  idempotent: true,
  resource: "organizer",
  title: "Get Organizer",
  description: "Retrieve a single organizer by ID.",
  params: [
    {
      key: "organizerId",
      label: "Organizer ID",
      type: "string",
      required: true,
      options: { source: "resolveFields" },
      config: { allowCustom: true },
    },
  ],
  resolveFields: resolveEventbriteFields,
  output: ORGANIZER_OUTPUT,
  sample: ORGANIZER_SAMPLE,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/organizers/${encodeURIComponent(input.organizerId)}/`);
  },
};

export default getOrganizer;
