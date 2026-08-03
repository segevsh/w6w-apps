import type { ActionDefinition } from "@w6w/types";
import { LemlistClient } from "../lib/client.ts";

interface Input {
  leadId: string;
  campaignId?: string;
}

/**
 * `POST /leads/pause/{leadId}`.
 *
 * `campaignId` is a QUERY parameter here, not a path segment — lemlist: "ID of
 * the campaign. If provided, pauses the lead only in that campaign." Omitting it
 * pauses the lead everywhere, so the param says so.
 *
 * Note the asymmetry with the interested/not-interested pair: those switch
 * ENDPOINT on scope, this one switches QUERY PARAMETER. Same idea, two different
 * spellings in the same API.
 */
const pauseLead: ActionDefinition<Input> = {
  key: "pause-lead",
  type: "perform",
  resource: "lead",
  title: "Pause Lead",
  description:
    "Pause a lead so the sequence stops sending to them. Scoped to one campaign when Campaign id is set, otherwise everywhere.",
  idempotent: true,
  params: [
    {
      key: "leadId",
      label: "Lead id",
      type: "string",
      required: true,
      placeholder: "lea_8xJSc7sV7ggpiVnXe",
    },
    {
      key: "campaignId",
      label: "Campaign id",
      type: "string",
      placeholder: "cam_A1B2C3D4E5F6G7H8I9",
      hint: "Sent as a query parameter. Leave empty to pause the lead in ALL campaigns.",
    },
  ],
  output: [{ key: "leads", type: "array", label: "Updated lead records" }],

  execute(input, ctx) {
    return new LemlistClient(ctx).request(
      `/leads/pause/${encodeURIComponent(input.leadId)}`,
      { method: "POST", query: { campaignId: input.campaignId } },
    );
  },
};

export default pauseLead;
