import type { ActionDefinition } from "@w6w/types";
import { netlifyFetch } from "../lib/client.ts";

/**
 * Trigger a new deploy for a site.
 * `POST /sites/{site_id}/deploys` —
 * https://open-api.netlify.com/ (operationId `createSiteDeploy`)
 *
 * The documented request body accepts direct file upload (`files`, a hash of
 * paths to SHA1 digests, or `zip`) alongside deploy metadata (`branch`,
 * `draft`, `functions`, `environment`, ...). This action deliberately omits
 * file upload — modeling a digest/zip deploy payload is out of scope for a
 * generic form — and sends only `branch` (body) and `title` (query, per the
 * spec). For a site connected to a Git repo, posting with no files rebuilds
 * from the repo's current HEAD (the same effect as Netlify's own "Trigger
 * deploy" button), which covers the common workflow-automation case: "kick
 * off a redeploy." Uploading arbitrary site content is left to Netlify's CLI
 * or a dedicated file-deploy action if a future need calls for it.
 */
const action: ActionDefinition = {
  key: "deploy-create",
  type: "perform",
  resource: "deploy",
  title: "Trigger a deploy",
  description: "Trigger a new deploy for a site (rebuilds from the linked Git repo)",
  idempotent: false,
  params: [
    {
      key: "siteId",
      label: "Site ID",
      type: "string",
      required: true,
      default: "",
      hint: "The site's ID",
    },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      default: "",
      hint: "Branch to deploy from. Defaults to the site's production branch.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      default: "",
      hint: "A label for this deploy, shown in the Netlify UI",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const siteId = String(p.siteId ?? "").trim();
    if (!siteId) throw new Error("`siteId` is required");

    const branch = String(p.branch ?? "").trim();
    const title = String(p.title ?? "").trim();

    const body: Record<string, unknown> = {};
    if (branch) body.branch = branch;

    const qs = new URLSearchParams();
    if (title) qs.set("title", title);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    ctx.log("info", "triggering Netlify deploy", { siteId, branch: branch || undefined });

    return await netlifyFetch(ctx, `/sites/${encodeURIComponent(siteId)}/deploys${suffix}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  },
};

export default action;
