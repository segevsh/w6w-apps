import type { ActionDefinition } from "@w6w/types";
import { compact, itemResult, jsonApiBody, RootlyClient, seg } from "../lib/client.ts";

interface Input {
  id: string;
  resolution_message?: string;
}

/** `PUT /v1/incidents/{id}/resolve` */
const incidentResolve: ActionDefinition<Input> = {
  key: "incident-resolve",
  type: "perform",
  resource: "incident",
  title: "Resolve Incident",
  description: "Move an incident to resolved, with an optional resolution message.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Incident ID",
      type: "string",
      required: true,
    },
    {
      key: "resolution_message",
      label: "Resolution message",
      type: "text",
      hint: "Recorded on the incident timeline.",
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
      "PUT",
      `/v1/incidents/${seg(input.id)}/resolve`,
      {
        body: jsonApiBody(
          "incidents",
          compact({
            resolution_message: input.resolution_message,
          }),
          input.id,
        ),
      },
    );
    return itemResult(res);
  },
};

export default incidentResolve;
