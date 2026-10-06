import type { ActionDefinition } from "@w6w/types";
import { camelKeys, seg, ses } from "../lib/api.ts";

/**
 * GetContact — `GET /v2/email/contact-lists/{ContactListName}/contacts/{EmailAddress}`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_GetContact.html
 */
interface Input {
  contactListName: string;
  emailAddress: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Read one contact in a contact list, with its topic preferences.",
  params: [
    { key: "contactListName", label: "Contact list", type: "string", required: true },
    { key: "emailAddress", label: "Email address", type: "string", required: true },
  ],
  output: [
    { key: "emailAddress", type: "string", label: "Address" },
    { key: "topicPreferences", type: "array", label: "Explicit topic subscriptions" },
    { key: "topicDefaultPreferences", type: "array", label: "Topic defaults" },
    { key: "unsubscribeAll", type: "boolean", label: "Unsubscribed from everything" },
    { key: "attributesData", type: "string", label: "Attributes, a JSON string" },
    { key: "createdTimestamp", type: "string", label: "Created" },
    { key: "lastUpdatedTimestamp", type: "string", label: "Updated" },
  ],

  async execute(input, ctx) {
    const res = await ses<Record<string, unknown>>(ctx, {
      op: "GetContact",
      path: `/v2/email/contact-lists/${seg(input.contactListName)}/contacts/${
        seg(input.emailAddress)
      }`,
    });
    return camelKeys(res);
  },
};

export default action;
