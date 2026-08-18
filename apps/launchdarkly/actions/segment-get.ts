import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient, resolveEnvironment, resolveProject } from "../lib/client.ts";
import { ENVIRONMENT_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /segments/{projectKey}/{environmentKey}/{segmentKey}` — verified against
 * LaunchDarkly's OpenAPI document (`getSegment`).
 *
 * A segment holds members two ways at once and they behave differently:
 * `included`/`excluded` are explicit lists of context keys, while `rules` match
 * on attributes. An explicit exclusion beats a matching rule, which is how
 * "this user is in the segment but should not be" is expressed — and why
 * reading only the rules gives the wrong answer about who is in it.
 */
const action: ActionDefinition = {
  key: "segment-get",
  type: "read",
  resource: "segment",
  title: "Get a segment",
  description: "Retrieve one segment, its explicit members and its rules.",
  params: [
    PROJECT_PARAM,
    ENVIRONMENT_PARAM,
    { key: "segmentKey", label: "Segment Key", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "key", type: "string", label: "Segment key" },
    { key: "name", type: "string", label: "Name" },
    { key: "included", type: "array", label: "Explicitly included context keys" },
    { key: "excluded", type: "array", label: "Explicitly excluded — beats a matching rule" },
    { key: "rules", type: "array", label: "Attribute rules" },
    { key: "unbounded", type: "boolean", label: "Big segment, held outside this API" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const environment = resolveEnvironment(ctx.connection, p.environmentKey);
    const segmentKey = String(p.segmentKey ?? "").trim();
    if (!segmentKey) throw new Error("`segmentKey` is required");

    ctx.log("info", "getting a LaunchDarkly segment", { project, environment, segmentKey });

    return await new LaunchDarklyClient(ctx).request(
      `/segments/${encodeURIComponent(project)}/${encodeURIComponent(environment)}/${
        encodeURIComponent(segmentKey)
      }`,
    );
  },
};

export default action;
