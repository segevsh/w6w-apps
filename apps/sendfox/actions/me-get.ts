import type { ActionDefinition } from "@w6w/types";
import { SendfoxClient } from "../lib/client.ts";

/**
 * `GET /me` — the authenticated account.
 *
 * Returns `{id, name, email, contacts_count, contact_limit, created_at,
 * updated_at}` — account metadata, and notably **not** the caller's own token,
 * which is what makes it usable as this app's credential probe and as the source
 * of the `X-RateLimit-*` headers `health/quota.ts` reads. Follow Up Boss's
 * `/me` and Mailjet's `/apikey` return the caller's key and are banned pack-wide
 * for exactly that reason; SendFox's does not.
 *
 * `contacts_count` against `contact_limit` is the account's own usage line —
 * the number that says when creating contacts will start answering `402`.
 */
type Input = Record<string, never>;

const meGet: ActionDefinition<Input> = {
  key: "me-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Read the authenticated account, including contact usage against its plan limit.",
  output: [
    { key: "id", type: "number", label: "Account id" },
    { key: "name", type: "string", label: "Account name" },
    { key: "email", type: "string", label: "Account email" },
    { key: "contacts_count", type: "number", label: "Contacts currently stored" },
    { key: "contact_limit", type: "number", label: "Contact limit on this plan" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  execute(_input, ctx) {
    return new SendfoxClient(ctx).json("/me");
  },
};

export default meGet;
