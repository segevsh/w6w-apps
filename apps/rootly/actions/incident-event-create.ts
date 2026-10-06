import type { ActionDefinition } from "@w6w/types";
import { compact, itemResult, jsonApiBody, RootlyClient, seg } from "../lib/client.ts";

interface Input {
  incident_id: string;
  event: string;
  visibility?: "internal" | "external";
}

/** `POST /v1/incidents/{incident_id}/events` */
const incidentEventCreate: ActionDefinition<Input> = {
  key: "incident-event-create",
  type: "perform",
  resource: "incident-event",
  title: "Create Incident Event",
  description: "Add a timeline note to an incident.",
  idempotent: false,
  params: [
    {
      key: "incident_id",
      label: "Incident ID",
      type: "string",
      required: true,
    },
    {
      key: "event",
      label: "Event text",
      type: "text",
      required: true,
      hint: "The note to add to the timeline.",
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: [{ value: "internal", label: "internal" }, { value: "external", label: "external" }],
    },
  ],
  output: [
    {
      key: "item",
      type: "object",
      label: "The record, flattened to its attributes plus `id` and `type`",
    },
    { key: "included", type: "array", label: "Side-loaded related records (same flattened shape)" },
  ],

  async execute(input, ctx) {
    const res = await new RootlyClient(ctx).request(
      "POST",
      `/v1/incidents/${seg(input.incident_id)}/events`,
      {
        body: jsonApiBody(
          "incident_events",
          compact({
            event: input.event,
            visibility: input.visibility,
          }),
        ),
      },
    );
    return itemResult(res);
  },
};

export default incidentEventCreate;
