import type { ActionDefinition } from "@w6w/types";
import { compact, PodiumClient } from "../lib/client.ts";

interface Input {
  phoneNumber: string;
  channelType?: string;
}

const contactCampaignOptOut: ActionDefinition<Input> = {
  key: "contact-campaign-opt-out",
  type: "perform",
  resource: "contact",
  title: "Opt Contact Out of Campaigns",
  description:
    "Opt a phone number out of campaign (marketing) messages. Podium requires your application to be whitelisted by support for this endpoint. Requires scope `write_contacts`.",
  idempotent: true,
  params: [{
    key: "phoneNumber",
    label: "Phone number",
    type: "string",
    required: true,
    hint: "Phone number in E.164 form (e.g. +15555550123).",
  }, {
    key: "channelType",
    label: "Channel type",
    type: "select",
    options: [{
      value: "PHONE",
      label: "PHONE",
    }],
    default: "PHONE",
  }],
  output: [{
    key: "address",
    type: "object",
    label: "The address of the contact",
  }, {
    key: "attributes",
    type: "array",
    label: "attributes",
  }, {
    key: "channels",
    type: "array",
    label: "List of channels for the contact",
  }, {
    key: "conversations",
    type: "array",
    label: "conversations",
  }, {
    key: "createdAt",
    type: "string",
    label: "Time at which the resource was created. Date time is in Coordinated Un",
  }, {
    key: "emails",
    type: "array",
    label: "List of the contacts email addresses",
  }, {
    key: "locations",
    type: "array",
    label: "locations",
  }, {
    key: "name",
    type: "string",
    label: "The name of the contact resource",
  }, {
    key: "organization",
    type: "object",
    label: "Reference to the organization resource",
  }, {
    key: "phoneNumbers",
    type: "array",
    label: "List of the contacts phone numbers",
  }, {
    key: "tags",
    type: "array",
    label: "tags",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for contact",
  }, {
    key: "updatedAt",
    type: "string",
    label: "Time at which the resource was updated. Date time is in Coordinated Un",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one("/contacts/campaigns/opt_out", {
      method: "POST",
      body: compact({
        channel: {
          identifier: input.phoneNumber,
          type: input.channelType ?? "PHONE",
        },
      }),
    });
  },
};

export default contactCampaignOptOut;
