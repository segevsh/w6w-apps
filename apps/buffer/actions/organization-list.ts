import type { ActionDefinition } from "@w6w/types";
import { BufferClient } from "../lib/client.ts";

/**
 * `query { account { organizations { … } } }` — the first call in almost every
 * Buffer workflow.
 *
 * Buffer's data model is `Account → Organizations → Channels → Posts`, and it
 * says outright that *"You'll need an organization ID for most operations.
 * Retrieve it first"*. There is no implicit current organization on the API,
 * not even for the single-organization account that most people have, and the
 * credential cannot narrow it: *"There is no per-organization scoping at this
 * time"*. So this action is a prerequisite, not a convenience — every listing
 * and creation action in this app takes an `organizationId` that comes from
 * here.
 *
 * There is no root `organizations` query. Organizations are only reachable as a
 * field of `account`, which is why this and `account-get` run the same query
 * root. They are separate actions because they answer different questions and a
 * workflow that wants org ids should not have to know that Buffer models them
 * as a sub-field of an account object.
 *
 * `Organization.limits` is deliberately not selected. It is a nested object of
 * plan ceilings (channels, ideas, members …) that costs complexity on every
 * call to answer a question nobody asked here; the `daily-posting-limit-list`
 * action exists for the limit that actually bites.
 */
const ORGANIZATIONS_QUERY = `query W6wOrganizations {
  account {
    id
    organizations {
      id
      name
      ownerEmail
      channelCount
    }
  }
}`;

interface Input {
  [key: string]: never;
}

interface AccountOrganizations {
  account?: {
    id?: string;
    organizations?: Array<{
      id?: string;
      name?: string;
      ownerEmail?: string;
      channelCount?: number;
    }>;
  };
}

const organizationList: ActionDefinition<Input> = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List Organizations",
  description:
    "Every organization (workspace) the connected Buffer account can see. Run this first — " +
    "almost every other action needs an organization ID and Buffer has no default.",
  params: [],
  output: [
    { key: "account.id", type: "string", label: "Account ID" },
    { key: "account.organizations", type: "array", label: "Organizations" },
    { key: "account.organizations[].id", type: "string", label: "Organization ID" },
    { key: "account.organizations[].name", type: "string", label: "Name" },
    { key: "account.organizations[].ownerEmail", type: "string", label: "Owner email" },
    { key: "account.organizations[].channelCount", type: "number", label: "Channel count" },
  ],

  execute(_input, ctx) {
    return new BufferClient(ctx).request<AccountOrganizations>(ORGANIZATIONS_QUERY);
  },
};

export default organizationList;
