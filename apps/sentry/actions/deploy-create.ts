import type { ActionDefinition } from "@w6w/types";
import { compact, csv, SentryClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `POST /api/0/organizations/{org}/releases/{version}/deploys/` — verified
 * against Sentry's OpenAPI schema (`createOrganizationReleaseDeploy`; body
 * requires `environment`).
 *
 * This is the call a CD pipeline makes after shipping: it is what turns
 * "release exists" into "release is live in production" for Sentry's release
 * health and regression detection.
 */
const action: ActionDefinition = {
  key: "deploy-create",
  type: "perform",
  resource: "deploy",
  title: "Create a deploy",
  description: "Record that a release was deployed to an environment.",
  // Each call records a new deploy — deliberately not idempotent, because
  // deploying twice IS two deploys.
  idempotent: false,
  params: [
    ORG_PARAM,
    { key: "version", label: "Version", type: "string", required: true, default: "" },
    {
      key: "environment",
      label: "Environment",
      type: "string",
      required: true,
      default: "",
      placeholder: "production",
    },
    { key: "name", label: "Name", type: "string", default: "", hint: "Optional deploy name." },
    { key: "url", label: "URL", type: "string", default: "" },
    { key: "dateStarted", label: "Date Started", type: "datetime", default: "" },
    {
      key: "dateFinished",
      label: "Date Finished",
      type: "datetime",
      default: "",
      hint: "Sentry defaults this to the current time when omitted.",
    },
    {
      key: "projects",
      label: "Project Slugs",
      type: "string",
      default: "",
      hint: "Comma-separated. Defaults to every project on the release.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Deploy ID" },
    { key: "environment", type: "string", label: "Environment" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "URL" },
    { key: "dateStarted", type: "string", label: "Started at" },
    { key: "dateFinished", type: "string", label: "Finished at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const version = String(p.version ?? "").trim();
    const environment = String(p.environment ?? "").trim();
    if (!version) throw new Error("`version` is required");
    if (!environment) throw new Error("`environment` is required");

    const body = compact({
      environment,
      name: p.name,
      url: p.url,
      dateStarted: p.dateStarted,
      dateFinished: p.dateFinished,
      projects: csv(p.projects),
    });

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    ctx.log("info", "creating Sentry deploy", { org, version, environment });

    return await client.request(
      `/organizations/${encodeURIComponent(org)}/releases/${encodeURIComponent(version)}/deploys/`,
      { method: "POST", body },
    );
  },
};

export default action;
