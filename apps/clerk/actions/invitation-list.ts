import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/** `GET /invitations` — a bare array, and only non-revoked invitations by default. */
const action: ActionDefinition = {
  key: "invitation-list",
  type: "read",
  resource: "invitation",
  title: "List application invitations",
  description: "List application invitations.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "accepted", label: "Accepted" },
        { value: "revoked", label: "Revoked" },
        { value: "expired", label: "Expired" },
      ],
    },
    {
      key: "query",
      label: "Search query",
      type: "string",
      default: "",
      hint: "Matches email " +
        "address or ID.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "data", type: "array", label: "Invitations" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const data = await new ClerkClient(ctx).requestArray("/invitations", {
      query: {
        status: p.status as string | undefined,
        query: p.query as string | undefined,
        limit: (p.limit as number | undefined) ?? 10,
        offset: (p.offset as number | undefined) ?? 0,
      },
    });
    return { data };
  },
};
export default action;
