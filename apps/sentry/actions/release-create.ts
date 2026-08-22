import type { ActionDefinition } from "@w6w/types";
import { compact, csv, SentryClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `POST /api/0/organizations/{org}/releases/` — verified against Sentry's
 * OpenAPI schema (`createOrganizationRelease`; body requires `version` and
 * `projects`).
 *
 * `refs` (the repository/commit pairs Sentry uses to associate commits with a
 * release) is passed as JSON rather than modelled: it is a list of
 * `{repository, commit, previousCommit?}` objects whose repository names are
 * install-specific.
 */
const action: ActionDefinition = {
  key: "release-create",
  type: "perform",
  resource: "release",
  title: "Create a release",
  description: "Register a new release for one or more projects.",
  // Sentry rejects a duplicate version for the same projects, so a blind retry
  // is not safe.
  idempotent: false,
  params: [
    ORG_PARAM,
    {
      key: "version",
      label: "Version",
      type: "string",
      required: true,
      default: "",
      placeholder: "myapp@1.2.3",
      hint: "A version number, a commit SHA, or any identifier your build produces.",
    },
    {
      key: "projects",
      label: "Project Slugs",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated list of the project slugs this release covers.",
    },
    {
      key: "ref",
      label: "Ref",
      type: "string",
      default: "",
      hint: "An optional commit reference this release was built from.",
    },
    { key: "url", label: "URL", type: "string", default: "", hint: "A link to the release." },
    { key: "dateReleased", label: "Date Released", type: "datetime", default: "" },
    {
      key: "refs",
      label: "Commit Refs",
      type: "json",
      default: "",
      placeholder: '[{"repository": "acme/web", "commit": "a1b2c3"}]',
      hint: "JSON array of {repository, commit, previousCommit?} to associate commits.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Release ID" },
    { key: "version", type: "string", label: "Version" },
    { key: "ref", type: "string", label: "Ref" },
    { key: "url", type: "string", label: "URL" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "dateReleased", type: "string", label: "Released at" },
    { key: "projects", type: "array", label: "Projects" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const version = String(p.version ?? "").trim();
    const projects = csv(p.projects);
    if (!version) throw new Error("`version` is required");
    if (!projects) throw new Error("`projects` is required — at least one project slug");

    let refs: unknown = undefined;
    if (typeof p.refs === "string" && p.refs.trim()) {
      try {
        refs = JSON.parse(p.refs);
      } catch {
        throw new Error("`refs` is not valid JSON");
      }
    } else if (Array.isArray(p.refs)) {
      refs = p.refs;
    }

    const body = compact({
      version,
      projects,
      ref: p.ref,
      url: p.url,
      dateReleased: p.dateReleased,
      refs,
    });

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    ctx.log("info", "creating Sentry release", { org, version, projects });

    return await client.request(`/organizations/${encodeURIComponent(org)}/releases/`, {
      method: "POST",
      body,
    });
  },
};

export default action;
