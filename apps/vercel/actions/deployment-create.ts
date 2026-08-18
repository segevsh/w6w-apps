import type { ActionDefinition } from "@w6w/types";
import { compact, json, VercelClient } from "../lib/client.ts";
import { TEAM_PARAM } from "../lib/params.ts";

/**
 * `POST /v13/deployments` — verified against Vercel's OpenAPI document
 * (`createDeployment`; body requires `name`).
 *
 * **Git-source deployments only.** The endpoint can also take an inline
 * `files` array, but that path means uploading every file of the build through
 * Vercel's files API first — an SDK/CLI job, not something a workflow form can
 * express. So this action exposes `gitSource`, the shape a "deploy this ref"
 * automation actually needs, and says so rather than half-implementing the
 * other one.
 *
 * `gitSource` is passed as JSON because its shape is a union keyed on `type`,
 * per the schema: `{type: "github", repoId, ref, sha?}`,
 * `{type: "gitlab", projectId, ref, sha?}`, `{type: "bitbucket", …}`, or
 * `{type: "vercel", sha}`. Modelling one arm as fields would quietly exclude
 * the rest.
 */
const action: ActionDefinition = {
  key: "deployment-create",
  type: "perform",
  resource: "deployment",
  title: "Create a deployment",
  description: "Trigger a new deployment for a project from a Git source.",
  // Vercel dedupes an identical deployment unless `forceNew` is set, but the
  // result of a retry is still a deployment that may or may not be the same
  // one — not safe to replay blindly.
  idempotent: false,
  params: [
    TEAM_PARAM,
    {
      key: "name",
      label: "Project Name",
      type: "string",
      required: true,
      default: "",
      hint: "Vercel's required `name` field — the project this deployment belongs to.",
    },
    {
      key: "project",
      label: "Project ID",
      type: "string",
      default: "",
      hint: "Optional project ID, when the name alone is ambiguous.",
    },
    {
      key: "gitSource",
      label: "Git Source",
      type: "json",
      default: "",
      placeholder: '{"type": "github", "repoId": 123456789, "ref": "main"}',
      hint: "The ref to deploy. Union keyed on `type`: github/gitlab/bitbucket/vercel.",
    },
    {
      key: "target",
      label: "Target",
      type: "select",
      default: "",
      options: [
        { value: "production", label: "Production" },
        { value: "staging", label: "Staging" },
      ],
      hint: "Omit for a preview deployment — Vercel's default.",
    },
    {
      key: "meta",
      label: "Metadata",
      type: "json",
      default: "",
      hint: "Arbitrary key/value metadata attached to the deployment.",
    },
    {
      key: "projectSettings",
      label: "Project Settings",
      type: "json",
      default: "",
      hint: "Per-deployment overrides (buildCommand, framework, outputDirectory, …).",
    },
    {
      key: "forceNew",
      label: "Force New",
      type: "boolean",
      default: false,
      hint: "Deploy even when an identical deployment already exists.",
    },
    {
      key: "skipAutoDetectionConfirmation",
      label: "Skip Framework Detection Confirmation",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Deployment ID" },
    { key: "url", type: "string", label: "Deployment URL" },
    { key: "name", type: "string", label: "Project name" },
    { key: "readyState", type: "string", label: "State" },
    { key: "target", type: "string", label: "Target" },
    { key: "inspectorUrl", type: "string", label: "Inspector URL" },
    { key: "createdAt", type: "number", label: "Created at (ms)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const body = compact({
      name,
      project: p.project,
      gitSource: json(p.gitSource, "gitSource"),
      target: p.target,
      meta: json(p.meta, "meta"),
      projectSettings: json(p.projectSettings, "projectSettings"),
    });

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "creating Vercel deployment", { name, target: p.target ?? "preview" });

    return await client.request("/v13/deployments", {
      method: "POST",
      body,
      query: {
        forceNew: p.forceNew === true ? "1" : undefined,
        // Vercel reads this one as the literal "1", not a boolean.
        skipAutoDetectionConfirmation: p.skipAutoDetectionConfirmation === true ? "1" : undefined,
      },
    });
  },
};

export default action;
