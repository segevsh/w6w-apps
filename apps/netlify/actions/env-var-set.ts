import type { ActionDefinition } from "@w6w/types";
import { netlifyFetch } from "../lib/client.ts";

/**
 * Create or update an environment variable's value for one deploy context.
 * `POST /accounts/{account_id}/env` —
 * https://open-api.netlify.com/ (operationId `createEnvVars`)
 *
 * The endpoint takes an array of `{ key, is_secret, values }` objects so
 * several variables can be created in one call; this action exposes the
 * common single-variable, single-context case (a `values` array with one
 * entry) rather than the batch form. Posting the same key again updates its
 * value for that context, which is why this reads as "set" rather than only
 * "create".
 */
const action: ActionDefinition = {
  key: "env-var-set",
  type: "perform",
  resource: "env-var",
  title: "Set an environment variable",
  description: "Create or update an environment variable's value for one deploy context",
  // Re-posting the same key/context/value leaves the same state — safe to retry.
  idempotent: true,
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      default: "",
      hint: "The account (team) slug or ID",
    },
    {
      key: "siteId",
      label: "Site ID",
      type: "string",
      default: "",
      hint: "If set, create the variable on this site instead of the account level",
    },
    {
      key: "key",
      label: "Key",
      type: "string",
      required: true,
      default: "",
      hint: "Variable name, e.g. API_URL (case-sensitive)",
    },
    {
      key: "value",
      label: "Value",
      type: "string",
      required: true,
      default: "",
      secret: true,
    },
    {
      key: "context",
      label: "Context",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All" },
        { value: "dev", label: "Dev" },
        { value: "dev-server", label: "Dev Server" },
        { value: "branch-deploy", label: "Branch Deploy" },
        { value: "deploy-preview", label: "Deploy Preview" },
        { value: "production", label: "Production" },
      ],
    },
    {
      key: "isSecret",
      label: "Secret",
      type: "boolean",
      default: false,
      hint: "Secret values are only readable by code running on Netlify's own systems",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const accountId = String(p.accountId ?? "").trim();
    const key = String(p.key ?? "").trim();
    const value = String(p.value ?? "");
    if (!accountId) throw new Error("`accountId` is required");
    if (!key) throw new Error("`key` is required");

    const siteId = String(p.siteId ?? "").trim();
    const context = String(p.context ?? "all").trim() || "all";

    const body = [{
      key,
      is_secret: p.isSecret === true,
      values: [{ value, context }],
    }];

    const qs = new URLSearchParams();
    if (siteId) qs.set("site_id", siteId);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    ctx.log("info", "setting Netlify env var", {
      accountId,
      key,
      context,
      siteId: siteId || undefined,
    });

    return await netlifyFetch(ctx, `/accounts/${encodeURIComponent(accountId)}/env${suffix}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  },
};

export default action;
