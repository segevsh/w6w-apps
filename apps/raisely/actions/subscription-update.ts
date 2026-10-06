import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, pick, RaiselyClient, seg } from "../lib/client.ts";
import { customFieldParams, overwriteParam, privateParam } from "../lib/params.ts";

interface Input {
  uuid: string;
  private?: boolean;
  amount?: number;
  count?: number;
  interval?: string;
  nextPayment?: string;
  anonymous?: boolean;
  message?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  preferredName?: string;
  public?: string | Record<string, unknown>;
  private_fields?: string | Record<string, unknown>;
  overwriteCustomFields?: boolean;
}

const subscriptionUpdate: ActionDefinition<Input> = {
  key: "subscription-update",
  type: "perform",
  resource: "subscription",
  title: "Update Subscription",
  description: "Update a recurring donation's amount, schedule, donor details or custom fields.",
  idempotent: true,
  params: [
    { key: "uuid", label: "Subscription uuid", type: "string", required: true },
    {
      key: "amount",
      label: "Amount (cents)",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Frequency, used with Interval (e.g. count 2 + interval WEEK = every two weeks).",
    },
    {
      key: "interval",
      label: "Interval",
      type: "select",
      options: [
        { value: "WEEK", label: "Week" },
        { value: "MONTH", label: "Month" },
        { value: "YEAR", label: "Year" },
        { value: "SEMI_MONTH", label: "Semi-month (needs anchorDays, not settable here)" },
      ],
    },
    {
      key: "nextPayment",
      label: "Next payment",
      type: "datetime",
      hint: "ISO 8601 timestamp of the next payment due date.",
    },
    { key: "anonymous", label: "Anonymous", type: "boolean" },
    { key: "message", label: "Donor message", type: "text" },
    { key: "email", label: "Email", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "fullName", label: "Full name", type: "string" },
    { key: "preferredName", label: "Preferred name", type: "string" },
    ...customFieldParams(),
    overwriteParam(),
    privateParam(),
  ],
  output: [
    { key: "uuid", type: "string", label: "Subscription uuid" },
    { key: "amount", type: "number", label: "Amount (cents)" },
    { key: "nextPayment", type: "string", label: "Next payment" },
  ],

  async execute(input, ctx) {
    const data = compact({
      ...pick(input, [
        "amount",
        "count",
        "interval",
        "nextPayment",
        "anonymous",
        "message",
        "email",
        "firstName",
        "lastName",
        "fullName",
        "preferredName",
      ]),
      ...customFields(input),
    });
    return await new RaiselyClient(ctx).data(`/subscriptions/${seg(input.uuid)}`, {
      method: "PATCH",
      query: compact({ private: input.private }),
      body: compact({ data, overwriteCustomFields: input.overwriteCustomFields }),
    });
  },
};

export default subscriptionUpdate;
