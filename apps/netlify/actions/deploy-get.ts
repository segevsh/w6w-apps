import type { ActionDefinition } from "@w6w/types";
import { netlifyFetch } from "../lib/client.ts";

/**
 * Get a single deploy by ID. Not scoped to a site — the `deploy_id` alone is
 * enough.
 * `GET /deploys/{deploy_id}` — https://open-api.netlify.com/ (operationId `getDeploy`)
 */
const action: ActionDefinition = {
  key: "deploy-get",
  type: "read",
  resource: "deploy",
  title: "Get a deploy",
  description: "Get details for a single deploy by ID",
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

    ctx.log("info", "getting Netlify deploy", { deployId });

    return await netlifyFetch(ctx, `/deploys/${encodeURIComponent(deployId)}`);
  },
};

export default action;
