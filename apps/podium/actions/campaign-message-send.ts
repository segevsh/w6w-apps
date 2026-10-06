import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
  channelIdentifier: string;
}

const campaignMessageSend: ActionDefinition<Input> = {
  key: "campaign-message-send",
  type: "perform",
  resource: "campaign",
  title: "Send Campaign Message",
  description:
    "Send a message to one recipient through a campaign. Not idempotent: every call sends. Requires scope `write_campaign_messages`.",
  idempotent: false,
  params: [{
    key: "uid",
    label: "Campaign UID",
    type: "string",
    required: true,
  }, {
    key: "channelIdentifier",
    label: "Recipient",
    type: "string",
    required: true,
    hint: "Phone number (E.164) or email address.",
  }],
  output: [{
    key: "attachmentUrl",
    type: "string",
    label: "URL of message attachment. This field is deprecated, please refer to t",
  }, {
    key: "body",
    type: "string",
    label: "Body of the message",
  }, {
    key: "contactName",
    type: "string",
    label: "Name of the contact",
  }, {
    key: "conversation",
    type: "object",
    label: "The conversation to which the message belongs",
  }, {
    key: "createdAt",
    type: "string",
    label: "When the message was created",
  }, {
    key: "failureReason",
    type: "string",
    label: "If the message failed to send, this will be the reason",
  }, {
    key: "items",
    type: "array",
    label: "items",
  }, {
    key: "location",
    type: "object",
    label: "Location from which the message was sent or to where the message was s",
  }, {
    key: "senderUid",
    type: "string",
    label: "Podium unique identifier for user. If the message was sent from Podium",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for message",
  }, {
    key: "webchatUrl",
    type: "string",
    label: "The page URL where the webchat widget was submitted from. Only present",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/campaigns/${encodeId(input.uid)}/messages`, {
      method: "POST",
      body: compact({
        channelIdentifier: input.channelIdentifier,
      }),
    });
  },
};

export default campaignMessageSend;
