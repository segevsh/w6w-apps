import type { ActionDefinition } from "@w6w/types";
import { compact, TwoChatClient } from "../lib/client.ts";

interface Input {
  firstName: string;
  lastName?: string;
  phone?: string;
  whatsappPhone?: string;
  email?: string;
  address?: string;
  profilePicUrl?: string;
  channelUuid?: string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  idempotent: false,
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a contact (POST /contacts). Optionally also create it on a connected WhatsApp number by " +
    "passing its channel UUID. Not idempotent: a retry creates a second contact.",
  params: [
    {
      key: "firstName",
      label: "First name",
      type: "string",
      required: true,
    },
    {
      key: "lastName",
      label: "Last name",
      type: "string",
    },
    {
      key: "phone",
      label: "Phone number",
      type: "string",
      hint: "International format, e.g. +12121112222. Stored as a `PH` detail.",
    },
    {
      key: "whatsappPhone",
      label: "WhatsApp phone number",
      type: "string",
      hint:
        "International format. Stored as a `WAPH` detail (a phone that has a WhatsApp account).",
    },
    {
      key: "email",
      label: "Email address",
      type: "string",
    },
    {
      key: "address",
      label: "Physical address",
      type: "string",
    },
    {
      key: "profilePicUrl",
      label: "Profile picture URL",
      type: "string",
      hint: "A publicly accessible URL.",
    },
    {
      key: "channelUuid",
      label: "WhatsApp channel UUID",
      type: "string",
      hint:
        "When set, the contact is also created on that WhatsApp number's account. From List Numbers.",
    },
  ],
  output: [
    { key: "contact", type: "object", label: "The created contact, with its `details`" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    const details = [
      { type: "PH", value: input.phone },
      { type: "WAPH", value: input.whatsappPhone },
      { type: "E", value: input.email },
      { type: "A", value: input.address },
    ].filter((d) => d.value);
    if (!input.firstName) throw new Error("contact-create needs a first name");
    if (details.length === 0) {
      throw new Error(
        "contact-create needs at least one of phone, whatsappPhone, email or address",
      );
    }
    // The docs' field table says `contact_details`, but every curl/Python/JS example (and the
    // vendor's own agent skill) sends `contact_detail`. The examples are what we follow.
    return client.post(
      "/contacts",
      compact({
        first_name: input.firstName,
        last_name: input.lastName,
        profile_pic_url: input.profilePicUrl,
        channel_uuid: input.channelUuid,
        contact_detail: details,
      }),
    );
  },
};

export default contactCreate;
