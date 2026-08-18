import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  csv,
  LaunchDarklyClient,
  resolveEnvironment,
  resolveProject,
} from "../lib/client.ts";
import { ENVIRONMENT_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /segments/{projectKey}/{environmentKey}` — verified against
 * LaunchDarkly's OpenAPI document (`postSegment`; required `key` and `name`).
 *
 * **A segment is created in one environment only.** Unlike a flag, which exists
 * across the project, a segment belongs to the environment it was made in — so
 * a workflow that wants the same audience in staging and production creates it
 * twice, and they drift independently from then on.
 */
const action: ActionDefinition = {
  key: "segment-create",
  type: "perform",
  resource: "segment",
  title: "Create a segment",
  description: "Create a segment in one environment. It does not exist in the others.",
  // LaunchDarkly rejects a duplicate key in the same environment.
  idempotent: false,
  params: [
    PROJECT_PARAM,
    ENVIRONMENT_PARAM,
    { key: "key", label: "Segment Key", type: "string", required: true, default: "" },
    { key: "name", label: "Name", type: "string", required: true, default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    { key: "tags", label: "Tags", type: "string", default: "", hint: "Comma-separated." },
    {
      key: "unbounded",
      label: "Big Segment",
      type: "boolean",
      default: false,
      hint: "For segments too large to hold inline. Their members are managed outside this API.",
    },
  ],
  output: [
    { key: "key", type: "string", label: "Segment key" },
    { key: "name", type: "string", label: "Name" },
    { key: "unbounded", type: "boolean", label: "Big segment" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const environment = resolveEnvironment(ctx.connection, p.environmentKey);
    const key = String(p.key ?? "").trim();
    if (!key) throw new Error("`key` is required");
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const body = compact({
      key,
      name,
      description: p.description,
      tags: csv(p.tags),
    });
    if (p.unbounded === true) body.unbounded = true;

    ctx.log("info", "creating a LaunchDarkly segment", { project, environment, key });

    return await new LaunchDarklyClient(ctx).request(
      `/segments/${encodeURIComponent(project)}/${encodeURIComponent(environment)}`,
      { method: "POST", body },
    );
  },
};

export default action;
