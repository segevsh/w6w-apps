import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  subscriberId: string;
  fields?: Record<string, unknown>;
  groups?: string[];
  status?: "active" | "unsubscribed" | "unconfirmed" | "bounced" | "junk";
  subscribedAt?: string;
  unsubscribedAt?: string;
  ipAddress?: string;
}

/**
 * `PUT /api/subscribers/:id` — takes an ID only (unlike the GET, which also
 * accepts an email), and carries no `email` field: the address cannot be
 * changed this way.
 *
 * The important asymmetry with `upsert-subscriber`: here `groups` is
 * AUTHORITATIVE — the subscriber is removed from any group not listed. Omit the
 * param entirely to leave group membership alone.
 *
 * MailerLite refuses to reactivate a subscriber whose status is `unsubscribed`,
 * `bounced` or `junk` through the API at all (abuse prevention); that has to
 * happen through the app, a form or a landing page.
 */
const updateSubscriber: ActionDefinition<Input> = {
  key: "update-subscriber",
  type: "perform",
  resource: "subscriber",
  title: "Update Subscriber",
  description:
    "Update a subscriber by id. Supplying `groups` REPLACES membership — unlisted groups are removed.",
  idempotent: true,
  params: [
    { key: "subscriberId", label: "Subscriber ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      hint: "JSON object keyed by field name. Values are added, never removed by omission.",
    },
    {
      key: "groups",
      label: "Group IDs",
      type: "json",
      hint: "JSON array of group ids. Authoritative — omit to leave membership untouched.",
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
      hint: "`yyyy-MM-dd HH:mm:ss`.",
    },
    {
      key: "unsubscribedAt",
      label: "Unsubscribed at",
      type: "string",
      hint: "`yyyy-MM-dd HH:mm:ss`.",
    },
    { key: "ipAddress", label: "IP address", type: "string" },
  ],
  output: [{ key: "data", type: "object", label: "Subscriber" }],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.fields) body.fields = input.fields;
    if (input.groups) body.groups = input.groups;
    if (input.status) body.status = input.status;
    if (input.subscribedAt) body.subscribed_at = input.subscribedAt;
    if (input.unsubscribedAt) body.unsubscribed_at = input.unsubscribedAt;
    if (input.ipAddress) body.ip_address = input.ipAddress;
    return client.request<MailerLiteEnvelope>(
      `/subscribers/${encodeURIComponent(input.subscriberId)}`,
      { method: "PUT", body },
    );
  },
};

export default updateSubscriber;
