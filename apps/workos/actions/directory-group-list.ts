import type { ActionDefinition } from "@w6w/types";
import { compact, WorkOSClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /directory_groups` — the groups the customer pushes over SCIM.
 *
 * Groups are how a customer expresses "these people are engineers" in a system
 * you do not control, which makes them the natural source for role assignment:
 * map their `Engineering` group to your `developer` role once, and every
 * joiner and leaver is handled by their IT department rather than yours.
 *
 * The names are the customer's, not yours, and they rename groups without
 * telling anybody — so map on the group **id** and keep the name for display.
 */
const action: ActionDefinition = {
  key: "directory-group-list",
  type: "read",
  resource: "directory-group",
  title: "List directory groups",
  description:
    "The groups a customer pushes over SCIM — the natural source for role assignment. Map on " +
    "the group id, since customers rename groups without telling anybody.",
  params: [
    { key: "directoryId", label: "Directory ID", type: "string", default: "" },
    { key: "organizationId", label: "Organization ID", type: "string", default: "" },
    {
      key: "userId",
      label: "Directory User ID",
      type: "string",
      default: "",
      hint: "Only the groups one person belongs to.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "groups", type: "array", label: "Directory groups" },
    { key: "count", type: "number", label: "Groups returned" },
    { key: "after", type: "string", label: "Cursor, when more remain" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const directoryId = String(p.directoryId ?? "").trim();
    const organizationId = String(p.organizationId ?? "").trim();
    const userId = String(p.userId ?? "").trim();
    if (!directoryId && !organizationId && !userId) {
      throw new Error("give a `directoryId`, an `organizationId` or a `userId`");
    }
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 50));

    const { items, after } = await new WorkOSClient(ctx).requestAll("/directory_groups", {
      query: compact({
        directory: directoryId,
        organization_id: organizationId,
        user: userId,
      }) as Record<string, string>,
    }, want);
    return { groups: items, count: items.length, after };
  },
};

export default action;
