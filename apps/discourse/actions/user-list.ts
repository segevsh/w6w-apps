import type { ActionDefinition } from "@w6w/types";
import { boolString, DiscourseClient, unset } from "../lib/client.ts";
import { pageParam, userFlagOptions, userOrderOptions, userOutput } from "../lib/params.ts";

/**
 * `GET /admin/users/list/{flag}.json` — the admin user directory.
 *
 * Three things this encodes from the reference:
 *
 *  - **The flag is a path segment, not a filter.** `active`, `new`, `staff`,
 *    `suspended`, `blocked` and `suspect` are the six values the route accepts,
 *    and every call selects exactly one. It defaults to `active` so the action
 *    is usable with no configuration at all.
 *  - **`asc` is a string whose enum is `["true"]`.** Like `ascending` on the
 *    topic lists, only its presence means anything; it is sent as the literal
 *    token and only when switched on.
 *  - **`show_emails` writes to the staff action log.** The reference states it
 *    plainly: "These requests will be logged in the staff action logs." That is
 *    a side effect on a `search` action, so it is advanced and the hint says so
 *    — an integration that turns it on will show up in the forum's own audit
 *    trail, and its operator should know that before it does.
 *
 * This is an **admin** route: a scoped, non-admin key gets a 403 here even
 * though `user-get` works fine.
 */
interface Input {
  flag?: string;
  order?: string;
  ascending?: boolean;
  page?: number;
  email?: string;
  ip?: string;
  showEmails?: boolean;
  stats?: boolean;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "Admin user directory, filtered by one of Discourse's six user flags.",
  params: [
    {
      key: "flag",
      label: "Flag",
      type: "select",
      default: "active",
      options: userFlagOptions,
      hint: "Selects the route, so exactly one applies per call.",
    },
    { key: "order", label: "Order by", type: "select", options: userOrderOptions },
    { key: "ascending", label: "Ascending", type: "boolean", hint: "Defaults to descending." },
    pageParam,
    {
      key: "email",
      label: "Email",
      type: "string",
      advanced: true,
      hint: "Narrow to the single user with this address.",
    },
    {
      key: "ip",
      label: "IP address",
      type: "string",
      advanced: true,
      hint: "Narrow to users seen from this IP.",
    },
    {
      key: "showEmails",
      label: "Include email addresses",
      type: "boolean",
      advanced: true,
      hint: "Discourse records this request in the forum's staff action log.",
    },
    { key: "stats", label: "Include stats", type: "boolean", advanced: true },
  ],
  output: userOutput.map((f) => ({ ...f, key: `[].${f.key}` })),

  execute(input, ctx) {
    const flag = encodeURIComponent(input.flag ?? "active");
    return new DiscourseClient(ctx).request(`/admin/users/list/${flag}.json`, {
      query: {
        order: unset(input.order),
        // Documented enum is `["true"]` — presence is the signal.
        asc: input.ascending ? boolString(true) : undefined,
        page: input.page,
        email: unset(input.email),
        ip: unset(input.ip),
        show_emails: input.showEmails ? true : undefined,
        stats: input.stats ? true : undefined,
      },
    });
  },
};

export default userList;
