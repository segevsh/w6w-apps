import type { ActionDefinition } from "@w6w/types";
import { compact, WorkOSClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /directory_users` — who the customer's directory says works there.
 *
 * ## This answers "who is here now", not "what changed"
 *
 * Worth being explicit about, because the difference decides whether a
 * provisioning workflow is correct. A user **deprovisioned in the customer's
 * Okta simply stops appearing here** — no tombstone, no flag, nothing to react
 * to. A workflow built on this list will create accounts reliably and never
 * close them.
 *
 * `event-list` carries `dsync.user.deleted` explicitly. Use this to reconcile
 * or report; use events to drive provisioning.
 *
 * ## `state` is not the same as being listed
 *
 * A user can be present with `state: "suspended"`, which is the customer
 * disabling them rather than removing them. Treating suspended as active is the
 * other half of the same mistake.
 */
const action: ActionDefinition = {
  key: "directory-user-list",
  type: "read",
  resource: "directory-user",
  title: "List directory users",
  description:
    "Who the customer's directory says works there now. A deprovisioned user just STOPS being " +
    "listed — use `event-list` if you need to react to that.",
  params: [
    {
      key: "directoryId",
      label: "Directory ID",
      type: "string",
      default: "",
      hint: "Give this or an organization id.",
    },
    { key: "organizationId", label: "Organization ID", type: "string", default: "" },
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      default: "",
      hint: "Only members of one directory group.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "users", type: "array", label: "Directory users" },
    { key: "count", type: "number", label: "Users returned" },
    { key: "activeCount", type: "number", label: "Users whose state is active" },
    { key: "after", type: "string", label: "Cursor, when more remain" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const directoryId = String(p.directoryId ?? "").trim();
    const organizationId = String(p.organizationId ?? "").trim();
    if (!directoryId && !organizationId) {
      throw new Error("give a `directoryId` or an `organizationId`");
    }
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 50));

    const { items, after } = await new WorkOSClient(ctx).requestAll<{ state?: string }>(
      "/directory_users",
      {
        query: compact({
          directory: directoryId,
          organization_id: organizationId,
          group: p.groupId,
        }) as Record<string, string>,
      },
      want,
    );

    const activeCount = items.filter((u) => u.state === "active").length;
    ctx.log("info", "read WorkOS directory users", { count: items.length, activeCount });
    return { users: items, count: items.length, activeCount, after };
  },
};

export default action;
