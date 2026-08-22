import type { ActionDefinition } from "@w6w/types";
import { csv, LaunchDarklyClient, resolveProject } from "../lib/client.ts";
import { LIST_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /flags/{projectKey}` — verified against LaunchDarkly's OpenAPI document
 * (`getFeatureFlags`).
 *
 * **Archived flags are excluded by default**, which is usually right and
 * occasionally the reason a flag "does not exist".
 *
 * The `env` filter is worth understanding: without it, each flag comes back
 * with its configuration for **every** environment, which on a project with a
 * dozen environments is a lot of payload for a question about one. Naming an
 * environment narrows what is returned, not which flags.
 */
const action: ActionDefinition = {
  key: "flag-list",
  type: "read",
  resource: "flag",
  title: "List flags",
  description: "List a project's feature flags.",
  params: [
    PROJECT_PARAM,
    {
      key: "env",
      label: "Environments",
      type: "string",
      default: "",
      hint: "Comma-separated. Narrows the per-environment configuration each flag carries — " +
        "without it you get all of them.",
    },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      default: "",
      hint: "Only flags carrying this tag.",
    },
    {
      key: "archived",
      label: "Archived Only",
      type: "boolean",
      default: false,
      hint: "Archived flags are excluded from the normal listing.",
    },
    {
      key: "summary",
      label: "Summary Only",
      type: "boolean",
      default: false,
      hint: "Omits the targeting rules — much smaller, and enough to find a flag key.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing LaunchDarkly flags", { project, returnAll, limit });

    return await new LaunchDarklyClient(ctx).requestAll(
      `/flags/${encodeURIComponent(project)}`,
      {
        query: {
          env: csv(p.env),
          tag: (p.tag as string) || undefined,
          archived: p.archived === true ? "true" : undefined,
          summary: p.summary === true ? "true" : undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
