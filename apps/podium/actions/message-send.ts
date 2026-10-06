import type { ActionDefinition } from "@w6w/types";
import { compact, PodiumClient } from "../lib/client.ts";

interface Input {
  body: string;
  locationUid: string;
  channelType: string;
  channelIdentifier: string;
  contactName?: string;
  senderName?: string;
  subject?: string;
  setOpenInbox?: boolean;
}

const messageSend: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description:
    "Send an SMS or email from a Podium location to a phone number or email address. Not idempotent: every call sends a message. Variables in template text are NOT expanded by Podium. Requires scope `write_messages`.",
  idempotent: false,
  params: [{
    key: "body",
    label: "Message",
    type: "text",
    required: true,
  }, {
    key: "locationUid",
    label: "Location UID",
    type: "string",
    required: true,
    hint: "The location that sends the message.",
  }, {
    key: "channelType",
    label: "Channel type",
    type: "select",
    required: true,
    options: [{
      value: "phone",
      label: "phone",
    }, {
      value: "email",
      label: "email",
    }],
  }, {
    key: "channelIdentifier",
    label: "Recipient",
    type: "string",
    required: true,
    hint: "Phone number (E.164) or email address, matching the channel type.",
  }, {
    key: "contactName",
    label: "Contact name",
    type: "string",
  }, {
    key: "senderName",
    label: "Sender name",
    type: "string",
  }, {
    key: "subject",
    label: "Subject",
    type: "string",
    hint: "Email only.",
  }, {
    key: "setOpenInbox",
    label: "Open the inbox conversation",
    type: "boolean",
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
    return new PodiumClient(ctx).one("/messages", {
      method: "POST",
      body: compact({
        body: input.body,
        locationUid: input.locationUid,
        channel: {
          type: input.channelType,
          identifier: input.channelIdentifier,
        },
        contactName: input.contactName,
        senderName: input.senderName,
        subject: input.subject,
        setOpenInbox: input.setOpenInbox,
      }),
    });
  },
};

export default messageSend;
