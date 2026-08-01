import type { ActionDefinition } from "@w6w/types";
import { netlifyFetch } from "../lib/client.ts";

/**
 * List environment variables for an account (optionally scoped to a site).
 * `GET /accounts/{account_id}/env` —
 * https://open-api.netlify.com/ (operationId `getEnvVars`)
 */
const action: ActionDefinition = {
  key: "env-var-list",
  type: "read",
  resource: "env-var",
  title: "List environment variables",
  description: "List environment variables for an account, optionally scoped to one site",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      default: "",
      hint: "The account (team) slug or ID, e.g. from the Netlify dashboard URL",
    },
    {
      key: "siteId",
      label: "Site ID",
      type: "string",
      default: "",
      hint: "If set, only return variables set on this site",
    },
    {
      key: "context",
      label: "Context",
      type: "select",
      default: "",
      hint: "Filter by deploy context",
      options: [
        { value: "", label: "Any" },
        { value: "all", label: "All" },
        { value: "dev", label: "Dev" },
        { value: "dev-server", label: "Dev Server" },
        { value: "branch-deploy", label: "Branch Deploy" },
        { value: "deploy-preview", label: "Deploy Preview" },
        { value: "production", label: "Production" },
      ],
    },
    {
      key: "scope",
      label: "Scope",
      type: "select",
      default: "",
      hint: "Filter by scope",
      options: [
        { value: "", label: "Any" },
        { value: "builds", label: "Builds" },
        { value: "functions", label: "Functions" },
        { value: "runtime", label: "Runtime" },
        { value: "post-processing", label: "Post-processing" },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const accountId = String(p.accountId ?? "").trim();
    if (!accountId) throw new Error("`accountId` is required");

    const siteId = String(p.siteId ?? "").trim();
    const context = String(p.context ?? "").trim();
    const scope = String(p.scope ?? "").trim();

    const qs = new URLSearchParams();
    if (siteId) qs.set("site_id", siteId);
    if (context) qs.set("context_name", context);
    if (scope) qs.set("scope", scope);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    ctx.log("info", "listing Netlify env vars", { accountId, siteId: siteId || undefined });

    return await netlifyFetch(ctx, `/accounts/${encodeURIComponent(accountId)}/env${suffix}`);
  },
};

export default action;
