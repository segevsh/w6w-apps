import type { ActionDefinition } from "@w6w/types";
import { json, LaunchDarklyClient, resolveProject } from "../lib/client.ts";
import { ENVIRONMENT_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `PATCH /flags/{projectKey}/{featureFlagKey}` with arbitrary **semantic patch
 * instructions** — verified against LaunchDarkly's OpenAPI document
 * (`patchFeatureFlag`).
 *
 * **Semantic patch is the format that makes this safe to automate**, and it is
 * selected by the `Content-Type` alone. LaunchDarkly's PATCH endpoints accept
 * three formats:
 *
 *   - plain `application/json` → JSON Patch (RFC 6902), an array of
 *     `{op, path, value}` against the flag's internal shape;
 *   - `application/merge-patch+json` → JSON merge patch;
 *   - `application/json; domain-model=launchdarkly.semanticpatch` →
 *     instructions like `{kind: "updateFallthroughVariationOrRollout"}`.
 *
 * Send instructions **without** that content-type parameter and LaunchDarkly
 * reads the body as a JSON Patch, which it is not — so the call fails with a
 * complaint about the patch document rather than anything about the header.
 * That is the trap this app closes: every semantic write goes through one code
 * path that sets it.
 *
 * Instructions are passed through rather than modelled, because there are
 * dozens of them and they change with the product — `addVariation`,
 * `updateOffVariation`, `addRule`, `addTags`, `updateDescription`. Modelling a
 * handful would just hide the rest.
 */
const action: ActionDefinition = {
  key: "flag-update",
  type: "perform",
  resource: "flag",
  title: "Update a flag",
  description: "Apply semantic patch instructions to a flag — targeting, variations, tags.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    { key: "flagKey", label: "Flag Key", type: "string", required: true, default: "" },
    {
      key: "instructions",
      label: "Instructions",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"kind":"updateDescription","value":"Checkout rewrite"},' +
        '{"kind":"addTags","values":["checkout"]}]',
      hint: "An array of `{kind, …}` objects. Sent as a semantic patch, which is what makes " +
        "them instructions rather than a diff.",
    },
    {
      ...ENVIRONMENT_PARAM,
      hint: "Required by instructions that act on one environment's targeting; ignored by the " +
        "rest.",
    },
    { key: "comment", label: "Comment", type: "string", default: "" },
  ],
  output: [
    { key: "key", type: "string", label: "Flag key" },
    { key: "name", type: "string", label: "Name" },
    { key: "environments", type: "object", label: "Per-environment state after the change" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const flagKey = String(p.flagKey ?? "").trim();
    if (!flagKey) throw new Error("`flagKey` is required");

    const instructions = json(p.instructions, "instructions");
    if (!Array.isArray(instructions) || instructions.length === 0) {
      throw new Error("`instructions` is required — a non-empty array of `{kind, …}` objects");
    }
    for (const [i, instruction] of instructions.entries()) {
      const kind = (instruction as Record<string, unknown>)?.kind;
      if (!kind || typeof kind !== "string") {
        throw new Error(`instruction ${i} has no \`kind\` — every instruction needs one`);
      }
    }

    const environment = String(p.environmentKey ?? "").trim();
    const comment = String(p.comment ?? "").trim();

    ctx.log("warn", "updating a LaunchDarkly flag", {
      project,
      flagKey,
      kinds: instructions.map((i) => (i as { kind: string }).kind),
    });

    return await new LaunchDarklyClient(ctx).semanticPatch(
      `/flags/${encodeURIComponent(project)}/${encodeURIComponent(flagKey)}`,
      instructions,
      {
        ...(environment ? { environmentKey: environment } : {}),
        ...(comment ? { comment } : {}),
      },
    );
  },
};

export default action;
