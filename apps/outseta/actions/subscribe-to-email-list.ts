import type { ActionDefinition } from "@w6w/types";
import { compact, OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  emailListUid: string;
  personUid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  sendWelcomeEmail?: boolean;
}

/** `POST /api/v1/email/lists/{emailListUid}/subscriptions` — Subscribe a person to a list — an existing one by Uid, or a new one by email address. */
const subscribeToEmailList: ActionDefinition<Input> = {
  key: "subscribe-to-email-list",
  type: "perform",
  resource: "email-list",
  title: "Subscribe to Email List",
  description:
    "Subscribe a person to a list \u2014 an existing one by Uid, or a new one by email address.",
  idempotent: false,
  params: [
    {
      key: "emailListUid",
      label: "Email list Uid",
      type: "string",
      hint: "The email list's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
    {
      key: "personUid",
      label: "Person Uid",
      type: "string",
      hint: "Subscribe an existing person. Leave empty and give an email to create one.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Subscribe a new person by email address.",
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
      key: "sendWelcomeEmail",
      label: "Send welcome email",
      type: "boolean",
      hint: "Defaults to false.",
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    if (!input.personUid && !input.email) throw new Error("Give either personUid or email");
    return OutsetaClient.fromConnection(ctx).request(
      `/email/lists/${pathId(input.emailListUid)}/subscriptions`,
      {
        method: "POST",
        body: {
          Person: compact({
            Uid: input.personUid,
            Email: input.email,
            FirstName: input.firstName,
            LastName: input.lastName,
          }),
          SendWelcomeEmail: input.sendWelcomeEmail,
        },
      },
    );
  },
};

export default subscribeToEmailList;
