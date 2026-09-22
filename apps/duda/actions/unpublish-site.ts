import type { ActionDefinition } from "@w6w/types";
import { DudaClient, seg } from "../lib/client.ts";

/**
 * `POST /api/sites/multiscreen/unpublish/{siteName}` — "Unpublish site".
 *
 * Takes the site off its live domain, leaving the site and its editor content
 * untouched. `204 No Content` on success, so the status is the result.
 *
 * `idempotent: true`: unpublishing an already-unpublished site is the state the
 * call asks for either way. Duda's documented rate limit is 20 calls/minute,
 * shared with publish.
 */
const unpublishSite: ActionDefinition<{ siteName: string }> = {
  key: "unpublish-site",
  type: "perform",
  resource: "site",
  title: "Unpublish Site",
  description:
    "Take a site off its live domain without deleting it. Answers 204 with no content. Duda's " +
    "rate limit for this endpoint is 20 calls/minute.",
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
      `/api/sites/multiscreen/unpublish/${seg(input.siteName)}`,
      { method: "POST" },
    );
    return { status };
  },
};

export default unpublishSite;
