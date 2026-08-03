import type { ActionDefinition } from "@w6w/types";
import { FathomClient, type ListResult } from "../lib/client.ts";
import {
  cursorParam,
  listOutput,
  settingsAccessOptions,
  teamParam,
  userStatusOptions,
} from "../lib/params.ts";

interface Input {
  cursor?: string;
  team?: string;
  status?: string;
  settingsAccess?: string;
}

/**
 * `GET /users` — every user on the account with their permissions.
 *
 * **Admin only.** Fathom answers 403 unless the key belongs to a user whose
 * `settings_access` is `account_admin`. That is why the credential health check
 * probes `/meetings` and not this: a perfectly good member key legitimately
 * cannot read it.
 *
 * Results come back active, then deactivated, then pending. Invited users have
 * no `permissions` object yet and their `created_at` is the invite date. The
 * `invited` status cannot be combined with a `settingsAccess` filter — Fathom
 * rejects that pair with a 400.
 */
const userGetMany: ActionDefinition<Input, ListResult> = {
  key: "user-get-many",
  type: "search",
  resource: "user",
  title: "Get Many Users",
  description:
    "List account users with their settings and view permissions. Requires an account-admin API key.",
  params: [
    cursorParam,
    teamParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: userStatusOptions,
      hint: "`invited` cannot be combined with a settings access filter.",
    },
    {
      key: "settingsAccess",
      label: "Settings access",
      type: "select",
      options: settingsAccessOptions,
    },
  ],
  output: listOutput,

  execute(input, ctx) {
    return new FathomClient(ctx).list("/users", {
      query: {
        cursor: input.cursor,
        team: input.team,
        status: input.status,
        settings_access: input.settingsAccess,
      },
    });
  },
};

export default userGetMany;
