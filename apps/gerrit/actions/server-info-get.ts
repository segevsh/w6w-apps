import type { ActionDefinition } from "@w6w/types";
import { GerritClient } from "../lib/client.ts";

/**
 * `GET /a/config/server/version` and `/config/server/info` — what this Gerrit
 * is and how it is configured.
 *
 * ## Gerrit instances differ enough that this is worth asking
 *
 * It is software people run, over versions spanning years, with per-instance
 * configuration that changes what the API does. Two settings in particular
 * decide whether a workflow behaves as expected:
 *
 * - **`accounts.visibility`** — whether this account can see other accounts at
 *   all. On a restricted instance `account-search` returns fewer people with
 *   no error, so an unresolvable reviewer may be a visibility policy rather
 *   than a missing person.
 * - **`auth.type`** — `LDAP`, `OAUTH`, `HTTP`, `DEVELOPMENT_BECOME_ANY_ACCOUNT`
 *   and others. It decides whether HTTP passwords exist at all, and the last
 *   one means the instance is a development server where anybody can become
 *   anybody.
 *
 * ## The version endpoint returns a bare JSON string
 *
 * `)]}'` followed by `"3.14.2-622-ge70cefe8a2"` — not an object. A client
 * expecting `{version: …}` gets a string, which is the kind of thing that only
 * shows up in production.
 */
const action: ActionDefinition = {
  key: "server-info-get",
  type: "read",
  resource: "server",
  title: "Get server info",
  description:
    "What this Gerrit is and how it is configured — the version, and the two settings that " +
    "change how the API behaves: ACCOUNT VISIBILITY, which can make a reviewer unresolvable " +
    "without an error, and the auth type, which decides whether HTTP passwords exist.",
  params: [],
  output: [
    { key: "version", type: "string", label: "The Gerrit version" },
    { key: "majorVersion", type: "number", label: "Just the major, for comparisons" },
    { key: "authType", type: "string", label: "How this instance authenticates people" },
    { key: "accountVisibility", type: "string", label: "Who can see whom" },
    { key: "isDevelopmentAuth", type: "boolean", label: "Anybody can become anybody" },
    { key: "requiresContributorAgreement", type: "boolean", label: "Pushes need a signed CLA" },
    { key: "changeConfig", type: "object", label: "Limits this instance places on changes" },
    { key: "info", type: "object", label: "The whole configuration document" },
  ],

  async execute(_input, ctx) {
    const client = new GerritClient(ctx);

    // A bare JSON string, not an object.
    const version = await client.request<string>("/config/server/version");

    const info = await client.request<{
      auth?: { auth_type?: string; use_contributor_agreements?: boolean };
      accounts?: { visibility?: string };
      change?: { update_delay?: number; large_change?: number };
    }>("/config/server/info");

    const authType = String(info?.auth?.auth_type ?? "");
    const isDevelopmentAuth = authType === "DEVELOPMENT_BECOME_ANY_ACCOUNT";
    if (isDevelopmentAuth) {
      ctx.log(
        "warn",
        "this Gerrit uses DEVELOPMENT_BECOME_ANY_ACCOUNT — anybody who can reach it can act as " +
          "anybody. It is a development setting, and it is not a mode to point a workflow at in " +
          "earnest",
        {},
      );
    }

    const visibility = String(info?.accounts?.visibility ?? "");
    if (visibility && visibility !== "ALL") {
      ctx.log(
        "info",
        `account visibility on this instance is ${visibility}, so account searches return fewer ` +
          "people than exist and do so without an error",
        {},
      );
    }

    const major = Number(String(version ?? "").split(".")[0]);

    return {
      version: String(version ?? ""),
      majorVersion: Number.isFinite(major) ? major : undefined,
      authType,
      accountVisibility: visibility,
      isDevelopmentAuth,
      requiresContributorAgreement: info?.auth?.use_contributor_agreements === true,
      changeConfig: info?.change,
      info,
    };
  },
};

export default action;
