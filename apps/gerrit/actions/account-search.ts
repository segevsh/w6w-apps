import type { ActionDefinition } from "@w6w/types";
import { GerritClient } from "../lib/client.ts";

/**
 * `GET /a/accounts/` — who is on this Gerrit.
 *
 * ## Resolving a person to an account id is what this is for
 *
 * Every other action takes a username, an email or a numeric id, and a
 * workflow routing reviews usually starts from an email address it got
 * somewhere else. This turns that into something Gerrit accepts.
 *
 * ## Inactive accounts still resolve, and cannot act
 *
 * Gerrit deactivates rather than deletes: the account keeps its id, its review
 * history and its name, and cannot log in or be added as a reviewer. So
 * assigning a review to somebody who has left fails at the point of assignment
 * rather than at lookup, which is a confusing place to discover it. This
 * action asks Gerrit for the inactive flag and reports it.
 *
 * ## Account visibility is a server setting
 *
 * A Gerrit configured with restricted account visibility returns fewer
 * accounts to a non-privileged caller, and returns them without error. So an
 * empty result may mean "no such person" or "you cannot see them", and
 * `server-info-get` reports which policy this instance uses.
 */
const action: ActionDefinition = {
  key: "account-search",
  type: "search",
  resource: "account",
  title: "Search accounts",
  description:
    "Resolve people to the ids Gerrit accepts. INACTIVE accounts still resolve and cannot be " +
    "added as reviewers, so a review assigned to somebody who left fails at assignment rather " +
    "than lookup. Visibility is a server policy, so an empty result is ambiguous.",
  params: [
    {
      key: "q",
      label: "Query",
      type: "string",
      required: true,
      default: "",
      placeholder: "ada@example.com or is:active name:Ada",
      hint: "An email, a username, a name, or Gerrit's account query syntax.",
    },
    {
      key: "includeInactive",
      label: "Include inactive accounts",
      type: "boolean",
      default: false,
    },
    { key: "limit", label: "Limit", type: "number", default: 25 },
  ],
  output: [
    { key: "accounts", type: "array", label: "The accounts" },
    { key: "count", type: "number", label: "How many, after filtering" },
    { key: "ids", type: "array", label: "Numeric account ids" },
    { key: "usernames", type: "array", label: "Usernames, which reviewer actions take" },
    { key: "inactiveCount", type: "number", label: "Resolvable, and unable to act" },
    { key: "exactMatch", type: "object", label: "The single account, when there is only one" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const q = String(p.q ?? "").trim();
    if (!q) throw new Error("`q` is required — an email address is the usual starting point");

    const url = new URLSearchParams();
    url.append("q", q);
    url.append("n", String(Math.max(1, Math.min(100, Number(p.limit ?? 25)))));
    for (const option of ["DETAILS", "ALL_EMAILS"]) url.append("o", option);

    const accounts = await new GerritClient(ctx).request<
      Array<{
        _account_id?: number;
        name?: string;
        username?: string;
        email?: string;
        inactive?: boolean;
      }>
    >(`/accounts/?${url.toString()}`);

    const all = Array.isArray(accounts) ? accounts : [];
    const inactive = all.filter((account) => account?.inactive === true);
    const list = p.includeInactive === true
      ? all
      : all.filter((account) => account?.inactive !== true);

    if (!list.length) {
      ctx.log(
        "info",
        "no accounts matched. Gerrit's account visibility is a server setting, so this may mean " +
          "the person does not exist or that this account cannot see them — `server-info-get` " +
          "reports which policy is in force",
        {},
      );
    }

    return {
      accounts: list.map((account) => ({
        id: account?._account_id,
        name: account?.name,
        username: account?.username,
        email: account?.email,
        isInactive: account?.inactive === true,
      })),
      count: list.length,
      ids: list.map((account) => account?._account_id).filter(Boolean),
      usernames: list.map((account) => account?.username).filter(Boolean),
      inactiveCount: inactive.length,
      exactMatch: list.length === 1 ? list[0] : undefined,
    };
  },
};

export default action;
