import type { ActionDefinition } from "@w6w/types";
import {
  csv,
  json,
  LaunchDarklyClient,
  resolveEnvironment,
  resolveProject,
} from "../lib/client.ts";
import { ENVIRONMENT_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `PATCH /segments/{projectKey}/{environmentKey}/{segmentKey}` with a
 * **semantic patch** — verified against LaunchDarkly's OpenAPI document
 * (`patchSegment`).
 *
 * The common case is adding or removing explicit members, so those two are
 * given their own fields and turned into `addIncludedTargets` /
 * `removeIncludedTargets` instructions. Anything else — rules, excluded
 * targets, descriptions — goes through the instructions passthrough, for the
 * same reason as on flags: there are dozens of instruction kinds and modelling
 * a few would hide the rest.
 *
 * As with every semantic write here, the content type is what makes the body
 * instructions rather than a JSON Patch — see `SEMANTIC_PATCH_CONTENT_TYPE`.
 */
const action: ActionDefinition = {
  key: "segment-update",
  type: "perform",
  resource: "segment",
  title: "Update a segment",
  description: "Add or remove segment members, or apply arbitrary semantic patch instructions.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    ENVIRONMENT_PARAM,
    { key: "segmentKey", label: "Segment Key", type: "string", required: true, default: "" },
    {
      key: "addKeys",
      label: "Add Context Keys",
      type: "string",
      default: "",
      hint: "Comma-separated. Added to the segment's explicit include list.",
    },
    {
      key: "removeKeys",
      label: "Remove Context Keys",
      type: "string",
      default: "",
      hint: "Comma-separated. Removed from the include list — not the same as excluding them.",
    },
    {
      key: "instructions",
      label: "Additional Instructions",
      type: "json",
      default: "",
      placeholder: '[{"kind":"addExcludedTargets","values":["user-123"]}]',
      hint: "Any other `{kind, …}` instructions, merged with the two fields above.",
    },
    { key: "comment", label: "Comment", type: "string", default: "" },
  ],
  output: [
    { key: "key", type: "string", label: "Segment key" },
    { key: "included", type: "array", label: "Explicit members after the change" },
    { key: "excluded", type: "array", label: "Explicit exclusions" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const environment = resolveEnvironment(ctx.connection, p.environmentKey);
    const segmentKey = String(p.segmentKey ?? "").trim();
    if (!segmentKey) throw new Error("`segmentKey` is required");

    const instructions: unknown[] = [];
    const add = csv(p.addKeys);
    if (add) instructions.push({ kind: "addIncludedTargets", values: add });
    const remove = csv(p.removeKeys);
    if (remove) instructions.push({ kind: "removeIncludedTargets", values: remove });

    const extra = json(p.instructions, "instructions");
    if (extra !== undefined) {
      if (!Array.isArray(extra)) {
        throw new Error("`instructions` must be an array of `{kind, …}` objects");
      }
      instructions.push(...extra);
    }
    if (instructions.length === 0) {
      throw new Error("nothing to change — add or remove keys, or pass instructions");
    }

    const comment = String(p.comment ?? "").trim();
    ctx.log("info", "updating a LaunchDarkly segment", {
      project,
      environment,
      segmentKey,
      instructions: instructions.length,
    });

    return await new LaunchDarklyClient(ctx).semanticPatch(
      `/segments/${encodeURIComponent(project)}/${encodeURIComponent(environment)}/${
        encodeURIComponent(segmentKey)
      }`,
      instructions,
      comment ? { comment } : {},
    );
  },
};

export default action;
