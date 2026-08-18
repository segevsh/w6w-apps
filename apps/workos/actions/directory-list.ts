import type { ActionDefinition } from "@w6w/types";
import { compact, WorkOSClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /directories` — the SCIM directories customers have connected.
 *
 * A Directory is the provisioning half of the enterprise story: the customer's
 * HR or IdP system pushes user and group membership at WorkOS over SCIM, and
 * WorkOS relays it as events. `state` is `linked` once it is running, and
 * anything else means the customer has not finished.
 *
 * SSO and Directory Sync are **independent** — a customer can have working
 * single sign-on and no directory at all, which means their new joiners can log
 * in but no account is created ahead of them. Comparing this list against
 * `connection-list` is how that gap gets found.
 */
const action: ActionDefinition = {
  key: "directory-list",
  type: "read",
  resource: "directory",
  title: "List directories",
  description:
    "The SCIM directories customers have connected. Independent of SSO — a customer can have " +
    "working sign-in and no provisioning at all.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", default: "" },
    {
      key: "search",
      label: "Search",
      type: "string",
      default: "",
      hint: "Matches the directory name.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "directories", type: "array", label: "Directories" },
    { key: "count", type: "number", label: "Directories returned" },
    { key: "after", type: "string", label: "Cursor, when more remain" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 50));
    const { items, after } = await new WorkOSClient(ctx).requestAll("/directories", {
      query: compact({
        organization_id: p.organizationId,
        search: p.search,
      }) as Record<string, string>,
    }, want);
    return { directories: items, count: items.length, after };
  },
};

export default action;
