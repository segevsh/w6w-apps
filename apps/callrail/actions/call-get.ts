import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam, fieldsParam } from "../lib/params.ts";

/** `GET /v3/a/{account_id}/calls/{call_id}.json` — a single call's record. */
interface Input {
  accountId: string;
  callId: string;
  fields?: string;
}

const callGet: ActionDefinition<Input> = {
  key: "call-get",
  type: "read",
  resource: "call",
  title: "Get Call",
  description: "Fetch a single call by id.",
  params: [
    accountIdParam,
    {
      key: "callId",
      label: "Call ID",
      type: "string",
      required: true,
      placeholder: "CAL8154748ae6bd4e278a7cddd38a662f4f",
      hint: "From the `id` of a List Calls result.",
    },
    {
      ...fieldsParam,
      hint: "Comma-separated extra fields, e.g. company_id,company_name,tags,milestones," +
        "keywords_spotted,transcription. Transcript fields require a Premium Conversation " +
        "Intelligence subscription and return null otherwise.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Call ID" },
    { key: "answered", type: "boolean", label: "Answered" },
    { key: "direction", type: "string", label: "inbound or outbound" },
    { key: "duration", type: "number", label: "Duration in seconds" },
    { key: "customer_name", type: "string", label: "Customer name" },
    { key: "customer_phone_number", type: "string", label: "Customer phone number" },
    { key: "tracking_phone_number", type: "string", label: "Tracking phone number" },
    { key: "start_time", type: "string", label: "Start time" },
    { key: "recording", type: "string", label: "Recording endpoint URL, if recorded" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(
      `/a/${encodeId(input.accountId)}/calls/${encodeId(input.callId)}.json`,
      { query: { fields: input.fields } },
    );
  },
};

export default callGet;
