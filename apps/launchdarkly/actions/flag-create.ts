import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, LaunchDarklyClient, resolveProject } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /flags/{projectKey}` — verified against LaunchDarkly's OpenAPI document
 * (`postFeatureFlag`; required `key` and `name`).
 *
 * **A new flag is created off in every environment**, which is the safe default
 * and worth knowing: creating it does not expose anything, and `flag-toggle` is
 * the separate act that does.
 *
 * **`temporary` is not decoration.** A flag marked temporary is one LaunchDarkly
 * will nag you to remove; a permanent flag is an operational switch meant to
 * stay. Getting it backwards is how a codebase accumulates flags nobody
 * remembers deciding to keep — so it is an explicit choice here, defaulted to
 * temporary, because most release flags are.
 */
const action: ActionDefinition = {
  key: "flag-create",
  type: "perform",
  resource: "flag",
  title: "Create a flag",
  description: "Create a feature flag, off in every environment.",
  // LaunchDarkly rejects a duplicate key rather than reusing it.
  idempotent: false,
  params: [
    PROJECT_PARAM,
    {
      key: "key",
      label: "Flag Key",
      type: "string",
      required: true,
      default: "",
      placeholder: "new-checkout",
      hint: "Permanent — this is what the SDK calls ask for, so renaming it means a code change.",
    },
    { key: "name", label: "Name", type: "string", required: true, default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "kind",
      label: "Kind",
      type: "select",
      default: "boolean",
      options: [
        { value: "boolean", label: "Boolean — on/off" },
        { value: "multivariate", label: "Multivariate — needs explicit variations" },
      ],
    },
    {
      key: "variations",
      label: "Variations",
      type: "json",
      default: "",
      placeholder:
        '[{"value":"control","name":"Control"},{"value":"treatment","name":"Treatment"}]',
      hint: "Required for a multivariate flag. A boolean flag gets true/false automatically.",
    },
    {
      key: "temporary",
      label: "Temporary",
      type: "boolean",
      default: true,
      hint: "On for a release flag LaunchDarkly should nag you to remove; off for an " +
        "operational switch meant to stay.",
    },
    { key: "tags", label: "Tags", type: "string", default: "", hint: "Comma-separated." },
  ],
  output: [
    { key: "key", type: "string", label: "Flag key" },
    { key: "name", type: "string", label: "Name" },
    { key: "kind", type: "string", label: "Kind" },
    { key: "variations", type: "array", label: "Variations" },
    { key: "environments", type: "object", label: "Per-environment state — all off" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const key = String(p.key ?? "").trim();
    if (!key) throw new Error("`key` is required");
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const kind = String(p.kind ?? "boolean");

    const variations = json(p.variations, "variations");
    if (kind === "multivariate") {
      if (!Array.isArray(variations) || variations.length < 2) {
        throw new Error(
          "a multivariate flag needs `variations` — at least two `{value, name}` objects",
        );
      }
    }

    const body = compact({
      key,
      name,
      description: p.description,
      variations: Array.isArray(variations) ? variations : undefined,
      tags: csv(p.tags),
    });
    // Meaningful when false, so not through `compact`.
    body.temporary = p.temporary !== false;

    ctx.log("info", "creating a LaunchDarkly flag", { project, key, kind });

    return await new LaunchDarklyClient(ctx).request(
      `/flags/${encodeURIComponent(project)}`,
      { method: "POST", body },
    );
  },
};

export default action;
