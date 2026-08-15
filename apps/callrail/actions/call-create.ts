import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

/**
 * `POST /v3/a/{account_id}/calls.json` — Creating an Outbound Phone Call.
 *
 * Places a real, billed phone call: first to `businessPhoneNumber`, then —
 * once that leg is answered — a second outbound dial connects
 * `customerPhoneNumber`. US/Canadian numbers only; the reference states it
 * "cannot be used to place calls to the United Kingdom and Australia."
 *
 * Every call this creates is new work with real-world side effects (a phone
 * actually rings), so `idempotent: false` regardless of retry safety at the
 * HTTP level — retrying a timed-out request risks placing the call twice.
 * This endpoint is also one of the three CallRail rate-limits separately from
 * general API traffic (100/hour, 2,000/day by default).
 */
interface Input {
  accountId: string;
  callerId: string;
  businessPhoneNumber: string;
  customerPhoneNumber: string;
  recordingEnabled?: boolean;
  outboundGreetingRecordingUrl?: string;
  outboundGreetingText?: string;
  agentId?: string;
}

const callCreate: ActionDefinition<Input> = {
  key: "call-create",
  type: "perform",
  resource: "call",
  title: "Create Outbound Call",
  description: "Place an outbound phone call connecting a business number to a customer " +
    "number. US and Canadian numbers only.",
  idempotent: false,
  params: [
    accountIdParam,
    {
      key: "callerId",
      label: "Caller ID",
      type: "string",
      required: true,
      hint: "A valid CallRail tracking number or verified Outbound Caller ID, in E.164 or " +
        "10-digit US/Canadian format.",
    },
    {
      key: "businessPhoneNumber",
      label: "Business phone number",
      type: "string",
      required: true,
      hint: "Dialed first, to connect the business side of the call.",
    },
    {
      key: "customerPhoneNumber",
      label: "Customer phone number",
      type: "string",
      required: true,
      hint: "Dialed once the business side answers.",
    },
    {
      key: "recordingEnabled",
      label: "Record this call",
      type: "boolean",
    },
    {
      key: "outboundGreetingRecordingUrl",
      label: "Greeting recording URL",
      type: "string",
      hint: "An audio file URL played to the customer when they answer.",
    },
    {
      key: "outboundGreetingText",
      label: "Greeting text",
      type: "string",
      hint: "Text read to the customer when they answer, if no greeting recording is set.",
    },
    {
      key: "agentId",
      label: "Agent",
      type: "string",
      hint: "CallRail user id to assign as the agent for this call.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Call ID" },
    { key: "direction", type: "string", label: "outbound" },
    { key: "business_phone_number", type: "string", label: "Business phone number" },
    { key: "customer_phone_number", type: "string", label: "Customer phone number" },
    { key: "start_time", type: "string", label: "Start time" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(`/a/${encodeId(input.accountId)}/calls.json`, {
      method: "POST",
      body: {
        caller_id: input.callerId,
        business_phone_number: input.businessPhoneNumber,
        customer_phone_number: input.customerPhoneNumber,
        recording_enabled: input.recordingEnabled,
        outbound_greeting_recording_url: input.outboundGreetingRecordingUrl,
        outbound_greeting_text: input.outboundGreetingText,
        agent_id: input.agentId,
      },
    });
  },
};

export default callCreate;
