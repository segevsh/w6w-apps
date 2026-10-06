import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, segment } from "../lib/client.ts";

/** `POST /api/client/v2/campaigns/{id}/actions` — Run Campaign Action. */
interface Input {
  id: string;
  action: string;
}

const campaignAction: ActionDefinition<Input> = {
  key: "campaign-action",
  type: "perform",
  resource: "campaign",
  title: "Run Campaign Action",
  description:
    "Start, pause, resume, complete, archive, unarchive or delete a campaign. START begins sending to its contacts.",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Campaign ID",
      type: "string",
      required: true,
      hint: "Campaign ID from the matching list action.",
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      options: [
        { value: "START", label: "START" },
        { value: "PAUSE", label: "PAUSE" },
        { value: "RESUME", label: "RESUME" },
        { value: "COMPLETE", label: "COMPLETE" },
        { value: "ARCHIVE", label: "ARCHIVE" },
        { value: "UNARCHIVE", label: "UNARCHIVE" },
        { value: "DELETE", label: "DELETE" },
      ],
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "campaignId, action and the resulting status" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request(
      "POST",
      `/campaigns/${segment(input.id, "Campaign ID")}/actions`,
      { body: compact({ action: need(input.action, "Action") }) },
    );
  },
};

export default campaignAction;
