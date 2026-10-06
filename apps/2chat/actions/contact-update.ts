import type { ActionDefinition } from "@w6w/types";
import { compact, parseJson, seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  contactUuid: string;
  firstName?: string;
  lastName?: string;
  profilePicUrl?: string;
  channelUuid?: string;
  contactDetails?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  idempotent: true,
  resource: "contact",
  title: "Update Contact",
  description:
    "Edit a contact (PUT /contacts/{contact-uuid}). Only the fields you supply are sent. Setting a " +
    "channel UUID syncs the contact to that WhatsApp number.",
  params: [
    {
      key: "contactUuid",
      label: "Contact UUID",
      type: "string",
      required: true,
    },
    {
      key: "firstName",
      label: "First name",
      type: "string",
    },
    {
      key: "lastName",
      label: "Last name",
      type: "string",
    },
    {
      key: "profilePicUrl",
      label: "Profile picture URL",
      type: "string",
    },
    {
      key: "channelUuid",
      label: "WhatsApp channel UUID",
      type: "string",
      hint: "Syncs the contact to that number's WhatsApp account.",
    },
    {
      key: "contactDetails",
      label: "Contact details",
      type: "json",
      hint:
        'Optional. 2Chat\'s own docs describe this field loosely; an array like [{"type":"PH","value":"+1…"}] matches the create endpoint\'s shape. Types: E, A, PH, WAPH.',
    },
  ],
  output: [
    { key: "contact", type: "object", label: "The updated contact" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    const details = parseJson(input.contactDetails, "contactDetails");
    const body = compact({
      first_name: input.firstName,
      last_name: input.lastName,
      profile_pic_url: input.profilePicUrl,
      channel_uuid: input.channelUuid,
      contact_details: details,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("contact-update needs at least one field to change");
    }
    return client.put(`/contacts/${seg(input.contactUuid)}`, body);
  },
};

export default contactUpdate;
