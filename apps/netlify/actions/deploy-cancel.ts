import type { ActionDefinition } from "@w6w/types";
import { netlifyFetch } from "../lib/client.ts";

/**
 * Cancel an in-progress deploy. Not scoped to a site, despite the
 * `cancelSiteDeploy` operationId — the documented path takes only
 * `deploy_id`.
 * `POST /deploys/{deploy_id}/cancel` —
 * https://open-api.netlify.com/ (operationId `cancelSiteDeploy`)
 */
const action: ActionDefinition = {
  key: "deploy-cancel",
  type: "perform",
  resource: "deploy",
  title: "Cancel a deploy",
  description: "Cancel an in-progress deploy",
  // Cancelling an already-cancelled deploy is a safe no-op-equivalent retry.
  idempotent: true,
  params: [
    {
      key: "deployId",
      label: "Deploy ID",
      type: "string",
      required: true,
      default: "",
      hint: "The deploy's ID",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const deployId = String(p.deployId ?? "").trim();
    if (!deployId) throw new Error("`deployId` is required");

    ctx.log("info", "cancelling Netlify deploy", { deployId });

    return await netlifyFetch(ctx, `/deploys/${encodeURIComponent(deployId)}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
  },
};

export default action;
