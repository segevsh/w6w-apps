import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";

/**
 * `GET /get_notifications` — recent activity on the account, newest first.
 *
 * The closest thing this API has to a change feed: expenses added, updated and
 * deleted, comments, group and friend membership changes. Splitwise publishes
 * no webhooks and this app declares no triggers, so polling this with
 * `updated_after` is how a workflow notices something happened.
 *
 * ## `limit: 0` means "as many as possible"
 *
 * > Omit (or provide `0`) to get the maximum number of notifications.
 *
 * The vendor's declared default *is* `0`, so leaving the field blank asks for
 * the maximum — the opposite of every other paging default in this API, where
 * blank means a modest page. This action leaves the field empty rather than
 * prefilling a number, because a small `limit` on a change feed silently drops
 * events, but the hint says what blank does.
 *
 * There is no `offset`: this endpoint pages by time, with `updated_after`.
 *
 * ## `content` is HTML, and `type` is an open enum
 *
 * > `content` will be suitable for display in HTML and uses only the
 * > `<strong>`, `<strike>`, `<small>`, `<br>` and `<font color="#FFEE44">` tags.
 *
 * So a plain-text destination needs to strip those; this action does not, since
 * stripping markup a caller may want to keep is not a decision to make on their
 * behalf.
 *
 * > The `type` value indicates what the notification is about. **Notification
 * > types may be added in the future without warning. Below is an incomplete
 * > list of notification types.**
 *
 * It is a bare integer, the documented list runs 0–15, and it is explicitly
 * incomplete — so `type` is passed through as the number Splitwise sent rather
 * than mapped to a label here. A mapping that silently swallowed an unknown
 * code would be worse than the number.
 */
interface Input {
  updated_after?: string;
  limit?: number;
}

const listNotifications: ActionDefinition<Input> = {
  key: "list-notifications",
  type: "read",
  resource: "notification",
  title: "List Notifications",
  description:
    "Recent activity on the account, newest first — the only change feed Splitwise offers, since " +
    "it publishes no webhooks.",
  params: [
    {
      key: "updated_after",
      label: "Updated after",
      type: "datetime",
      hint:
        "Only notifications after this time, ISO 8601. Carry the newest `created_at` from the " +
        "previous run to poll incrementally.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Unusually, Splitwise's default here is `0`, meaning the maximum it will return — so " +
        "leaving this empty asks for as many as possible, not a small page.",
    },
  ],
  output: [{ key: "notifications", type: "array", label: "Notifications, newest first" }],

  async execute(input, ctx) {
    const body = await new SplitwiseClient(ctx).request("/get_notifications", {
      query: { updated_after: input.updated_after, limit: input.limit },
    });
    return { notifications: pick<unknown[]>(body, "notifications", []) };
  },
};

export default listNotifications;
