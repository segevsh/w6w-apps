import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { TEAM_PARAM } from "../lib/params.ts";

/**
 * `GET /v3/deployments/{idOrUrl}/events` — verified against Vercel's OpenAPI
 * document (`getDeploymentEvents`). These are the **build** logs.
 *
 * The response is a bare array, not a paged envelope, so this action does not
 * use the cursor pager: `limit` goes straight to Vercel, and `-1` is its
 * documented "return everything" value.
 *
 * `follow` is deliberately not exposed. Vercel streams live events when it is
 * set, which would hold the request open for the life of a build — an action
 * runs to completion, so a stream is the wrong shape for it.
 */
const action: ActionDefinition = {
  key: "deployment-event-list",
  type: "read",
  resource: "deployment",
  title: "List a deployment's build logs",
  description: "Read the build events (logs) a deployment produced.",
  params: [
    TEAM_PARAM,
    {
      key: "idOrUrl",
      label: "Deployment ID or URL",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      hint: "Vercel's own limit. Use -1 to return every event.",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      default: "",
      options: [
        { value: "forward", label: "Forward (oldest first)" },
        { value: "backward", label: "Backward (newest first)" },
      ],
    },
    { key: "since", label: "Since", type: "number", default: null, hint: "Timestamp (ms)." },
    { key: "until", label: "Until", type: "number", default: null, hint: "Timestamp (ms)." },
    {
      key: "builds",
      label: "Builds Only",
      type: "boolean",
      default: false,
      hint: "Vercel's `builds=1` flag.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const idOrUrl = String(p.idOrUrl ?? "").trim();
    if (!idOrUrl) throw new Error("`idOrUrl` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "reading Vercel build logs", { idOrUrl });

    return await client.request(`/v3/deployments/${encodeURIComponent(idOrUrl)}/events`, {
      query: {
        limit: typeof p.limit === "number" ? p.limit : undefined,
        direction: (p.direction as string) || undefined,
        since: typeof p.since === "number" ? p.since : undefined,
        until: typeof p.until === "number" ? p.until : undefined,
        builds: p.builds === true ? 1 : undefined,
      },
    });
  },
};

export default action;
