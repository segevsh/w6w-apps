import type { ActionDefinition } from "@w6w/types";
import { compact, WorkOSClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /user_management/organization_memberships` — who belongs to which customer.
 *
 * A membership is the join between a User and an Organization, and it carries
 * the **role**. It is also the thing that decides what a person sees after
 * signing in, which makes it the row an access review actually cares about —
 * not the user, and not the directory entry.
 *
 * `statuses` is the parameter worth knowing. A membership can be
 * **`pending`**, meaning the person was invited into the organization and has
 * not accepted, and pending memberships are returned alongside active ones. An
 * access review that does not filter counts invitations as access.
 */
const action: ActionDefinition = {
  key: "organization-membership-list",
  type: "read",
  resource: "organization-membership",
  title: "List organization memberships",
  description:
    "Who belongs to which customer, and with what role — the row an access review cares about. " +
    "Pending invitations are listed alongside active members unless filtered.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", default: "" },
    { key: "userId", label: "User ID", type: "string", default: "" },
    {
      key: "statuses",
      label: "Statuses",
      type: "select",
      default: "active",
      options: [
        { value: "active", label: "Active only" },
        { value: "pending", label: "Pending invitations only" },
        { value: "", label: "All — active, pending and inactive" },
      ],
      hint: "An unfiltered list counts an unaccepted invitation as access.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "memberships", type: "array", label: "Memberships" },
    { key: "count", type: "number", label: "Memberships returned" },
    { key: "after", type: "string", label: "Cursor, when more remain" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organizationId = String(p.organizationId ?? "").trim();
    const userId = String(p.userId ?? "").trim();
    if (!organizationId && !userId) {
      throw new Error("give an `organizationId` or a `userId`");
    }
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 50));
    const statuses = p.statuses === undefined ? "active" : String(p.statuses);

    const { items, after } = await new WorkOSClient(ctx).requestAll(
      "/user_management/organization_memberships",
      {
        query: compact({
          organization_id: organizationId,
          user_id: userId,
          statuses: statuses || undefined,
        }) as Record<string, string>,
      },
      want,
    );
    return { memberships: items, count: items.length, after };
  },
};

export default action;
