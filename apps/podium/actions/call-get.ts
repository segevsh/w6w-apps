import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

const callGet: ActionDefinition<Input> = {
  key: "call-get",
  type: "read",
  resource: "call",
  title: "Get Call",
  description: "Get one call by uid. Requires scope `read_phones`.",
  params: [{
    key: "uid",
    label: "Call UID",
    type: "string",
    required: true,
  }],
  output: [{
    key: "aiAbandoned",
    type: "boolean",
    label: "Whether the caller abandoned the AI",
  }, {
    key: "contact",
    type: "object",
    label: "The CRM contact matched to the customer number, if any",
  }, {
    key: "conversationUid",
    type: "string",
    label: "Podium unique identifier for conversation",
  }, {
    key: "createdAt",
    type: "string",
    label: "When Podium recorded the call",
  }, {
    key: "customerPhoneNumber",
    type: "string",
    label: "The customer's phone number",
  }, {
    key: "direction",
    type: "string",
    label: "Whether the call was initiated by the customer (inbound) or the locati",
  }, {
    key: "durationSeconds",
    type: "number",
    label: "Total call duration in seconds, including ring time",
  }, {
    key: "endedAt",
    type: "string",
    label: "When the call ended: when it started plus its duration, or, for a call",
  }, {
    key: "eventType",
    type: "string",
    label: "eventType",
  }, {
    key: "handledByAi",
    type: "boolean",
    label: "Whether Podium's AI handled the call",
  }, {
    key: "hasVoicemail",
    type: "boolean",
    label: "Whether a voicemail recording was left",
  }, {
    key: "isPrivate",
    type: "boolean",
    label: "Whether the call was placed from a private number",
  }, {
    key: "locationPhoneNumber",
    type: "string",
    label: "The Podium location's phone number",
  }, {
    key: "locationUid",
    type: "string",
    label: "Podium unique identifier for location",
  }, {
    key: "organizationUid",
    type: "string",
    label: "Podium unique identifier for organization",
  }, {
    key: "phoneDetailsUrl",
    type: "string",
    label: "Deep link to the call in Podium",
  }, {
    key: "startedAt",
    type: "string",
    label: "When the call began",
  }, {
    key: "status",
    type: "string",
    label: "Current or final state of the call",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for call",
  }, {
    key: "updatedAt",
    type: "string",
    label: "When the call record last changed. `since` compares against this field",
  }, {
    key: "userUid",
    type: "string",
    label: "UID of the user who handled the call, if any",
  }, {
    key: "voicemail",
    type: "object",
    label: "Present when a voicemail was left. Fetch the transcript and recording ",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/calls/${encodeId(input.uid)}`);
  },
};

export default callGet;
