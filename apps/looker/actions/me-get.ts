import type { ActionDefinition } from "@w6w/types";
import { LookerClient } from "../lib/client.ts";

/**
 * `GET /api/4.0/user` — who this credential is inside Looker.
 *
 * ## Everything this app can see is what this user can see
 *
 * Looker has no scoping on an API credential. Access is decided entirely by the
 * user the credential belongs to: which models their role permits, which
 * folders they can open, and — crucially — which **rows** their user attributes
 * filter them down to.
 *
 * That last one is the subtle part. Looker's access filters use user attributes
 * to restrict rows per user, so the *same query* run by two credentials
 * legitimately returns different data. A workflow comparing figures across two
 * connections may be comparing two different slices of the same table, with
 * nothing indicating it.
 *
 * So this is the call that answers "why does this workflow see different
 * numbers from the dashboard" — and the answer is usually the user.
 */
const action: ActionDefinition = {
  key: "me-get",
  type: "read",
  resource: "user",
  title: "Get the current user",
  description:
    "Who this credential is in Looker. There is no scope on a Looker API key — access is the " +
    "USER's, including row-level access filters, so the same query run by two credentials can " +
    "legitimately return different data.",
  params: [],
  output: [
    { key: "user", type: "object", label: "The user" },
    { key: "id", type: "string", label: "Their id" },
    { key: "displayName", type: "string", label: "Their name" },
    { key: "email", type: "string", label: "Their email" },
    { key: "roleIds", type: "array", label: "Which roles decide what they may do" },
    { key: "groupIds", type: "array", label: "Which groups they belong to" },
    {
      key: "isDisabled",
      type: "boolean",
      label: "A disabled user authenticates and can do nothing",
    },
    { key: "hasApiCredentials", type: "boolean", label: "Whether API3 credentials are attached" },
  ],

  async execute(_input, ctx) {
    const user = await new LookerClient(ctx).request<{
      id?: string;
      display_name?: string;
      email?: string;
      role_ids?: string[];
      group_ids?: string[];
      is_disabled?: boolean;
      credentials_api3?: Array<unknown>;
    }>("/user");

    if (user?.is_disabled) {
      ctx.log(
        "warn",
        "this credential belongs to a disabled Looker user — the login works and every query " +
          "will be refused",
        {},
      );
    }

    return {
      user,
      id: user?.id,
      displayName: user?.display_name,
      email: user?.email,
      // What the credential may do is entirely a property of these.
      roleIds: user?.role_ids ?? [],
      groupIds: user?.group_ids ?? [],
      isDisabled: user?.is_disabled === true,
      hasApiCredentials: (user?.credentials_api3 ?? []).length > 0,
    };
  },
};

export default action;
