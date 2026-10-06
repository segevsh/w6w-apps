import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, pick, RaiselyClient, seg } from "../lib/client.ts";
import { customFieldParams } from "../lib/params.ts";

interface Input {
  uuid: string;
  email?: string;
  fullName?: string;
  preferredName?: string;
  lastName?: string;
  message?: string;
  anonymous?: boolean;
  thankyouMessage?: string;
  thankyouIsPrivate?: boolean;
  public?: string | Record<string, unknown>;
  private_fields?: string | Record<string, unknown>;
}

const donationUpdate: ActionDefinition<Input> = {
  key: "donation-update",
  type: "perform",
  resource: "donation",
  title: "Update Donation",
  description:
    "Update a donation's donor details, message, anonymity, fundraiser thank-you or custom fields. " +
    "Amounts and payment details cannot be changed here.",
  idempotent: true,
  params: [
    { key: "uuid", label: "Donation uuid", type: "string", required: true },
    { key: "email", label: "Donor email", type: "string" },
    { key: "fullName", label: "Full name", type: "string" },
    { key: "preferredName", label: "Preferred name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "message", label: "Donor message", type: "text" },
    { key: "anonymous", label: "Anonymous", type: "boolean" },
    {
      key: "thankyouMessage",
      label: "Thank-you message",
      type: "text",
      hint: "Message to the donor from the fundraiser.",
    },
    {
      key: "thankyouIsPrivate",
      label: "Thank-you is private",
      type: "boolean",
      hint: "Whether the fundraiser wants the thank-you message kept private.",
    },
    ...customFieldParams(),
  ],
  output: [
    { key: "uuid", type: "string", label: "Donation uuid" },
    { key: "amount", type: "number", label: "Amount (cents)" },
  ],

  async execute(input, ctx) {
    const thankyou = compact({
      message: input.thankyouMessage,
      isPrivate: input.thankyouIsPrivate,
    });
    const data = compact({
      ...pick(input, ["email", "fullName", "preferredName", "lastName", "message", "anonymous"]),
      thankyou: Object.keys(thankyou).length ? thankyou : undefined,
      ...customFields(input),
    });
    return await new RaiselyClient(ctx).data(`/donations/${seg(input.uuid)}`, {
      method: "PATCH",
      body: { data },
    });
  },
};

export default donationUpdate;
