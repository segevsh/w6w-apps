import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";

/**
 * `GET /get_current_user` — who does this connection belong to?
 *
 * The response is `{"user": …}` with the `current_user` schema: the plain
 * `user` fields (`id`, `first_name`, `last_name`, `email`,
 * `registration_status`, `picture`, `custom_picture`) plus `notifications_read`,
 * `notifications_count`, `notifications` (a map of boolean preferences),
 * `default_currency` and `locale`.
 *
 * Nothing in it is a credential — verified field by field against the schema,
 * which is what makes the same endpoint safe to use as the auth probe. Unlike
 * Mailjet's `/apikey` or Follow Up Boss's `/me`, Splitwise's whoami hands back
 * no key, token or password of any kind.
 *
 * The usual reason to call it in a workflow is `id`: the by-shares form of
 * Create Expense needs the payer's numeric user id, and this is where it comes
 * from.
 */
const getCurrentUser: ActionDefinition<Record<string, never>> = {
  key: "get-current-user",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Fetch the Splitwise account this connection authenticates as.",
  params: [],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "default_currency", type: "string", label: "Default currency" },
    { key: "locale", type: "string", label: "Locale" },
    { key: "notifications_count", type: "number", label: "Unread notifications" },
  ],

  async execute(_input, ctx) {
    const body = await new SplitwiseClient(ctx).request("/get_current_user");
    return pick<Record<string, unknown>>(body, "user", {});
  },
};

export default getCurrentUser;
