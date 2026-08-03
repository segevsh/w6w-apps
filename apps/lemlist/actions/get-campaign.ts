import type { ActionDefinition } from "@w6w/types";
import { LemlistClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

/**
 * `GET /campaigns/{campaignId}`.
 *
 * Returns the single Campaign object — including `senders`, `sequenceId` and
 * `scheduleIds`, which are the ids the sequence and schedule endpoints take.
 */
const getCampaign: ActionDefinition<Input> = {
  key: "get-campaign",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description:
    "Fetch one campaign by id, including its senders, sequence id, schedule ids and any blocking errors.",
  params: [
    {
      key: "campaignId",
      label: "Campaign id",
      type: "string",
      required: true,
      placeholder: "cam_A1B2C3D4E5F6G7H8I9",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Campaign id" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "senders", type: "array", label: "Senders" },
    { key: "hasError", type: "boolean", label: "Whether the campaign has blocking errors" },
  ],

  execute(input, ctx) {
    return new LemlistClient(ctx).request(
      `/campaigns/${encodeURIComponent(input.campaignId)}`,
    );
  },
};

export default getCampaign;
