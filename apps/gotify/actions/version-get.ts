import type { ActionDefinition } from "@w6w/types";
import { GotifyClient } from "../lib/client.ts";

/**
 * `GET /version` — verified against Gotify's OpenAPI document
 * (`getVersion`). Unauthenticated on the wire (`router/router.go` registers
 * it outside every auth group), but this action still needs a Connection —
 * unlike a hosted vendor, there is no fixed address to ask without one; see
 * `lib/client.ts` on why the egress allowlist is `"*"` for the same reason.
 * Kept as an action alongside the `instance` health check because "what
 * build is this instance running" is sometimes exactly what a workflow step
 * wants to know, not just a health-page fact.
 */
const action: ActionDefinition = {
  key: "version-get",
  type: "read",
  resource: "instance",
  title: "Get version",
  description: "The Gotify server version, commit and build date for this connection.",
  params: [],
  output: [
    { key: "version", type: "string", label: "Version" },
    { key: "commit", type: "string", label: "Commit" },
    { key: "buildDate", type: "string", label: "Build date" },
  ],

  async execute(_input, ctx) {
    return await new GotifyClient(ctx).request("/version");
  },
};

export default action;
