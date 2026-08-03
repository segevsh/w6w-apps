import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  email: string;
  fields?: Record<string, unknown>;
  groups?: string[];
  status?: "active" | "unsubscribed" | "unconfirmed" | "bounced" | "junk";
  subscribedAt?: string;
  ipAddress?: string;
  resubscribe?: boolean;
}

/**
 * `POST /api/subscribers` is an UPSERT, not a create: "If a subscriber already
 * exists, it will be updated with new values." It answers 201 on create and 200
 * on update.
 *
 * The merge is NON-DESTRUCTIVE in both directions — omitting a field leaves it
 * alone, and omitting a group does not remove the subscriber from it. That is
 * the difference from `update-subscriber` (PUT), where an omitted group IS
 * removed. Choose accordingly.
 *
 * Non-destructive + same-body-same-result makes this safe to retry, hence
 * `idempotent: true`.
 */
const upsertSubscriber: ActionDefinition<Input> = {
  key: "upsert-subscriber",
  type: "perform",
  resource: "subscriber",
  title: "Create or Update Subscriber",
  description:
    "Create the subscriber if the email is new, otherwise merge the values in. Never removes fields or groups.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      placeholder: "name@example.com",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      hint: 'JSON object keyed by field name, e.g. `{"name": "Ada", "last_name": "Lovelace"}`.',
    },
    {
      key: "groups",
      label: "Group IDs",
      type: "json",
      hint: "JSON array of existing group ids. Adds only — never removes.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "unsubscribed", label: "Unsubscribed" },
        { value: "unconfirmed", label: "Unconfirmed" },
        { value: "bounced", label: "Bounced" },
        { value: "junk", label: "Junk" },
      ],
    },
    {
      key: "subscribedAt",
      label: "Subscribed at",
      type: "string",
      hint: "MailerLite's own format: `yyyy-MM-dd HH:mm:ss` (not ISO 8601).",
    },
    { key: "ipAddress", label: "IP address", type: "string" },
    {
      key: "resubscribe",
      label: "Resubscribe",
      type: "boolean",
      default: false,
      hint: "Reactivate a previously unsubscribed subscriber.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Subscriber" }],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    const body: Record<string, unknown> = { email: input.email };
    if (input.fields) body.fields = input.fields;
    if (input.groups) body.groups = input.groups;
    if (input.status) body.status = input.status;
    if (input.subscribedAt) body.subscribed_at = input.subscribedAt;
    if (input.ipAddress) body.ip_address = input.ipAddress;
    if (input.resubscribe !== undefined) body.resubscribe = input.resubscribe;
    return client.request<MailerLiteEnvelope>("/subscribers", { method: "POST", body });
  },
};

export default upsertSubscriber;
