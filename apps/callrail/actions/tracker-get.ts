import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam, fieldsParam } from "../lib/params.ts";

/** `GET /v3/a/{account_id}/trackers/{tracker_id}.json` — a single tracker. */
interface Input {
  accountId: string;
  trackerId: string;
  fields?: string;
}

const trackerGet: ActionDefinition<Input> = {
  key: "tracker-get",
  type: "read",
  resource: "tracker",
  title: "Get Tracker",
  description: "Fetch a single tracker by id.",
  params: [
    accountIdParam,
    {
      key: "trackerId",
      label: "Tracker ID",
      type: "string",
      required: true,
      placeholder: "TRK8154748ae6bd4e278a7cddd38a662f4f",
    },
    { ...fieldsParam, hint: "e.g. campaign_name, swap_targets." },
  ],
  output: [
    { key: "id", type: "string", label: "Tracker ID" },
    { key: "name", type: "string", label: "Tracker name" },
    { key: "type", type: "string", label: "source or session" },
    { key: "status", type: "string", label: "active or disabled" },
    { key: "tracking_numbers", type: "array", label: "Tracking phone numbers" },
    { key: "destination_number", type: "string", label: "Destination phone number" },
    { key: "sms_enabled", type: "boolean", label: "SMS enabled" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(
      `/a/${encodeId(input.accountId)}/trackers/${encodeId(input.trackerId)}.json`,
      { query: { fields: input.fields } },
    );
  },
};

export default trackerGet;
