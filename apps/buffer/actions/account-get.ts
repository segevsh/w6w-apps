import type { ActionDefinition } from "@w6w/types";
import { BufferClient } from "../lib/client.ts";

/**
 * `query { account }` — who the Connection belongs to.
 *
 * Useful in a workflow for two things: confirming which Buffer account a run is
 * acting as, and reading `timezone`, which is the account-level default Buffer
 * applies to *"streaks, posting plans, and new channel connections"* and is
 * therefore the thing to reason about when a `dueAt` lands an hour off.
 *
 * ## What this selects, and what it does not
 *
 * `Account` has ten fields. This action takes seven and skips three, on
 * purpose:
 *
 *  - **`email` and `backupEmail`** — the account holder's addresses. They are
 *    offered behind an explicit opt-in (`includeEmail`) rather than pulled by
 *    default, because a workflow that wanted the timezone should not
 *    incidentally pipe someone's recovery address into a downstream step.
 *  - **`connectedApps`** — every OAuth client the user has authorised, with
 *    `clientId`, `name`, `website` and `userId` for each. Not selected at all.
 *    Nothing in it is a secret, but it is a list of *other* integrations'
 *    identifiers, and no action here needs it. `tests/index.test.ts` greps for
 *    it so it does not creep back in.
 *
 * The auth `test` probe is narrower still — `{ account { id } }`, one scalar.
 * See `auth/api-key.ts` for why the probe was picked by reading its response
 * body rather than by its name.
 */
const ACCOUNT_QUERY = `query W6wAccount {
  account {
    id
    name
    avatar
    timezone
    createdAt
    preferences { timeFormat startOfWeek defaultScheduleOption }
    organizations { id name channelCount }
  }
}`;

const ACCOUNT_QUERY_WITH_EMAIL = `query W6wAccountWithEmail {
  account {
    id
    name
    avatar
    timezone
    createdAt
    email
    backupEmail
    preferences { timeFormat startOfWeek defaultScheduleOption }
    organizations { id name channelCount }
  }
}`;

interface Input {
  includeEmail?: boolean;
}

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description:
    "The Buffer account behind this Connection — name, timezone, scheduling preferences and " +
    "its organizations. Email addresses are opt-in.",
  params: [
    {
      key: "includeEmail",
      label: "Include email addresses",
      type: "boolean",
      advanced: true,
      hint: "Adds `email` and `backupEmail`. Off by default — they are the account holder's " +
        "personal addresses and nothing else here needs them.",
    },
  ],
  output: [
    { key: "account.id", type: "string", label: "Account ID" },
    { key: "account.name", type: "string", label: "Name" },
    { key: "account.avatar", type: "string", label: "Avatar URL" },
    { key: "account.timezone", type: "string", label: "Timezone" },
    { key: "account.createdAt", type: "string", label: "Created at" },
    { key: "account.email", type: "string", label: "Email (opt-in)" },
    { key: "account.backupEmail", type: "string", label: "Backup email (opt-in)" },
    { key: "account.preferences", type: "object", label: "Preferences" },
    { key: "account.organizations", type: "array", label: "Organizations" },
  ],

  execute(input, ctx) {
    const query = input.includeEmail ? ACCOUNT_QUERY_WITH_EMAIL : ACCOUNT_QUERY;
    return new BufferClient(ctx).request(query);
  },
};

export default accountGet;
