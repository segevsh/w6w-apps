import type { ActionDefinition } from "@w6w/types";
import { SanityClient } from "../lib/client.ts";

/**
 * `GET /projects` on the management API — every project this token can see.
 *
 * The one call in this app that is not project-scoped: it goes to the bare
 * `api.sanity.io`, not to `{projectId}.api.sanity.io`, because it is asking
 * what projects exist rather than reading one.
 *
 * Useful mostly for setup and for auditing what a token reaches — most tokens
 * are issued per project, so a token that lists several is a broader credential
 * than it may have been meant to be.
 */
const action: ActionDefinition = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List projects",
  description:
    "Projects this token can see, from the management API. A token that lists several is " +
    "broader than a per-project token — worth knowing.",
  params: [],
  output: [
    { key: "projects", type: "array", label: "Projects" },
  ],

  async execute(_input, ctx) {
    const projects = await new SanityClient(ctx).request<unknown[]>("/projects", {
      management: true,
    });
    return { projects };
  },
};

export default action;
