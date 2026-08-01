import type { ActionDefinition } from "@w6w/types";
import { BitlyClient } from "../lib/client.ts";

interface Input {
  organizationGuid?: string;
}

interface Group {
  guid: string;
  name: string;
  organization_guid?: string;
  is_active?: boolean;
  role?: string;
}

interface ListGroupsResult {
  items: Group[];
}

/**
 * GET /groups
 *
 * Every Bitly account has at least one group (its default), and Bitlink
 * listing/creation is scoped by `group_guid` — this is how a caller
 * discovers the GUIDs those other actions need. Not paginated by Bitly, so
 * there's no cursor to thread through.
 */
const listGroups: ActionDefinition<Input, ListGroupsResult> = {
  key: "list-groups",
  type: "search",
  resource: "group",
  title: "List Groups",
  description: "List the Bitly groups accessible to the connected account.",
  params: [
    {
      key: "organizationGuid",
      label: "Organization GUID",
      type: "string",
      hint: "Restrict to one organization. Omit to list every group the account can see.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Groups" },
  ],

  async execute(input, ctx) {
    const client = new BitlyClient(ctx);
    const res = await client.request<{ groups: Group[] }>("/groups", {
      query: { organization_guid: input.organizationGuid },
    });
    return { items: res.groups };
  },
};

export default listGroups;
