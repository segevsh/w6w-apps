import type { ActionDefinition } from "@w6w/types";
import { DudaClient, seg } from "../lib/client.ts";

/**
 * `POST /api/sites/multiscreen/publish/{siteName}` — "Publish site".
 *
 * Duda documents `204 No Content` on success, so there is no body to return;
 * the status is the whole result. Marked `idempotent: true` because publishing
 * an already-published site converges on the same state — Duda puts no version
 * or draft counter on this call, so a retry after a dropped connection cannot
 * publish anything twice.
 *
 * Duda's own rate limit for this endpoint is 20 calls/minute (the docs list
 * publish and unpublish together), on top of the global 10 calls/second.
 */
const publishSite: ActionDefinition<{ siteName: string }> = {
  key: "publish-site",
  type: "perform",
  resource: "site",
  title: "Publish Site",
  description:
    "Publish a site to its live domain. Answers 204 with no content. Duda's rate limit for this " +
    "endpoint is 20 calls/minute.",
  idempotent: true,
  params: [
    {
      key: "siteName",
      label: "Site name",
      type: "string",
      required: true,
      hint: "Duda's site alias (`site_name`).",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status (204 on success)" },
  ],

  async execute(input, ctx) {
    const { status } = await new DudaClient(ctx).send(
      `/api/sites/multiscreen/publish/${seg(input.siteName)}`,
      { method: "POST" },
    );
    return { status };
  },
};

export default publishSite;
