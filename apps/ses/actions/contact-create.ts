import type { ActionDefinition } from "@w6w/types";
import { seg, ses, templateData, toJson } from "../lib/api.ts";

/**
 * CreateContact — `POST /v2/email/contact-lists/{ContactListName}/contacts`. A contact that already
 * exists is a 400 `AlreadyExistsException`. `AttributesData` is a JSON string on the wire.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_CreateContact.html
 */
interface Input {
  contactListName: string;
  emailAddress: string;
  topicPreferences?: unknown;
  unsubscribeAll?: boolean;
  attributesData?: unknown;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Add a contact to a contact list.",
  idempotent: false,
  params: [
    { key: "contactListName", label: "Contact list", type: "string", required: true },
    { key: "emailAddress", label: "Email address", type: "string", required: true },
    {
      key: "topicPreferences",
      label: "Topic preferences",
      type: "json",
      hint: 'Array of {"TopicName": "...", "SubscriptionStatus": "OPT_IN" | "OPT_OUT"}.',
    },
    { key: "unsubscribeAll", label: "Unsubscribe from all", type: "boolean" },
    {
      key: "attributesData",
      label: "Attributes",
      type: "json",
      hint: "Arbitrary attributes stored with the contact.",
    },
  ],
  output: [
    { key: "emailAddress", type: "string", label: "Address" },
    { key: "created", type: "boolean", label: "True when SES accepted the contact" },
  ],

  async execute(input, ctx) {
    await ses(ctx, {
      op: "CreateContact",
      method: "POST",
      path: `/v2/email/contact-lists/${seg(input.contactListName)}/contacts`,
      body: {
        EmailAddress: input.emailAddress,
        TopicPreferences: toJson(input.topicPreferences, "Topic preferences"),
        UnsubscribeAll: input.unsubscribeAll,
        AttributesData: templateData(input.attributesData),
      },
    });
    return { emailAddress: input.emailAddress, created: true };
  },
};

export default action;
