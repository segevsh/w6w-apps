import type { ActionDefinition } from "@w6w/types";
import { compact, itemResult, jsonApiBody, RootlyClient, seg } from "../lib/client.ts";

interface Input {
  id: string;
  mitigation_message?: string;
}

/** `PUT /v1/incidents/{id}/mitigate` */
const incidentMitigate: ActionDefinition<Input> = {
  key: "incident-mitigate",
  type: "perform",
  resource: "incident",
  title: "Mitigate Incident",
  description: "Move an incident to mitigated, with an optional mitigation message.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Incident ID",
      type: "string",
      required: true,
    },
    {
      key: "mitigation_message",
      label: "Mitigation message",
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
      `/v1/incidents/${seg(input.id)}/mitigate`,
      {
        body: jsonApiBody(
          "incidents",
          compact({
            mitigation_message: input.mitigation_message,
          }),
          input.id,
        ),
      },
    );
    return itemResult(res);
  },
};

export default incidentMitigate;
